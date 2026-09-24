import './one-click-pr-or-gist.css';

import cx from 'clsx';
import React from 'dom-chef';
import * as pageDetect from 'github-url-detection';
import {$, $$, $optional, elementExists} from 'select-dom';

import {withTooltipRef} from '../components/tooltip.js';
import features from '../feature-manager.js';

function init(signal: AbortSignal): void | false {
	const initialGroupedButtons = $optional('.BtnGroup:has([name="draft"], [name="gist[public]"])');
	if (!initialGroupedButtons) {
		// 1. Free accounts can't open Draft PRs in private repos, so this element is missing
		// 2. PRs can't be created from some comparison pages: Either base is a tag, not a branch; or there already exists a PR.
		return false;
	}

	const parent = initialGroupedButtons.parentElement!;

	let draftButton: HTMLButtonElement | undefined;
	let primaryButton: HTMLButtonElement | undefined;

	for (const dropdownItem of $$('.select-menu-item', initialGroupedButtons)) {
		let title = $('.select-menu-item-heading', dropdownItem).textContent.trim();
		const description = $('.description', dropdownItem).textContent.trim();
		const radioButton = $('input[type=radio]', dropdownItem);
		const classList = ['btn', 'ml-2'];
		const isDraft = /\bdraft\b/i.test(title);

		if (isDraft) {
			title = 'Create draft PR';
		} else {
			classList.push('btn-primary');
		}

		const button = (
			<button
				ref={withTooltipRef(description)}
				data-disable-invalid
				className={cx(classList)}
				type="submit"
				name={radioButton.name}
				value={radioButton.value}
			>
				{title}
			</button>
		) as HTMLButtonElement;

		initialGroupedButtons.after(button);
		if (isDraft) {
			draftButton = button;
		} else {
			primaryButton = button;
		}
	}

	initialGroupedButtons.remove();

	if (draftButton && primaryButton) {
		const draft = draftButton;
		const primary = primaryButton;
		const form = draft.form!;
		let activeUploads = 0;

		function syncDraftButton(): void {
			draft.disabled = activeUploads > 0 || primary.disabled;
		}

		function startUpload(): void {
			activeUploads += 1;
			syncDraftButton();
		}

		function finishUpload(): void {
			activeUploads = Math.max(0, activeUploads - 1);
			queueMicrotask(syncDraftButton);
		}

		form.addEventListener('upload:setup', startUpload, {signal, capture: true});
		form.addEventListener('upload:complete', finishUpload, {signal});
		form.addEventListener('upload:error', finishUpload, {signal});
		form.addEventListener('upload:invalid', finishUpload, {signal});
	}

	// Add minimal structure validation before adding a dangerous class
	if (parent.classList.contains('d-flex') && parent.parentElement!.classList.contains('flex-justify-end')) {
		parent.parentElement!.classList.add('flex-wrap');
	}
}

void features.add(import.meta.url, {
	include: [
		pageDetect.isCompare,
		pageDetect.isGist,
	],
	exclude: [
		() => elementExists('[data-show-dialog-id="drafts-upgrade-dialog"]'),
	],
	deduplicate: 'has-rgh',
	awaitDomReady: true,
	init,
});

/*

Test URLs

- Normal: https://github.com/refined-github/sandbox/compare/default-a...fregante-patch-1
- "Allow edits from maintainers": https://github.com/refined-github/refined-github/compare/main...fregante:refined-github:main?expand=1

*/
