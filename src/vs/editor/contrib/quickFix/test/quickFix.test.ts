/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import URI from 'vs/base/common/uri';
import Severity from 'vs/base/common/severity';
import { Model } from 'vs/editor/common/model/model';
import { CodeActionProviderRegistry, LanguageIdentifier, CodeActionProvider, Command, WorkspaceEdit, IResourceEdit } from 'vs/editor/common/modes';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { Range } from 'vs/editor/common/core/range';
import { getCodeActions } from 'vs/editor/contrib/quickFix/quickFix';

suite('QuickFix', () => {

	let langId = new LanguageIdentifier('fooLang', 17);
	let uri = URI.parse('untitled:path');
	let model: Model;
	let disposables: IDisposable[] = [];
	let testData = {
		diagnostics: {
			abc: {
				title: 'bTitle',
				diagnostics: [{
					startLineNumber: 1,
					startColumn: 1,
					endLineNumber: 2,
					endColumn: 1,
					severity: Severity.Error,
					message: 'abc'
				}]
			},
			bcd: {
				title: 'aTitle',
				diagnostics: [{
					startLineNumber: 1,
					startColumn: 1,
					endLineNumber: 2,
					endColumn: 1,
					severity: Severity.Error,
					message: 'bcd'
				}]
			}
		},
		command: {
			abc: {
				command: new class implements Command {
					id: '1';
					title: 'abc';
				},
				title: 'Extract to inner function in function "test"'
			}
		},
		spelling: {
			bcd: {
				diagnostics: [],
				edits: new class implements WorkspaceEdit {
					edits: IResourceEdit[];
				},
				title: 'abc'
			}
		},
		tsLint: {
			abc: {
				$ident: 57,
				arguments: [],
				id: '_internal_command_delegation',
				title: 'abc'
			},
			bcd: {
				$ident: 47,
				arguments: [],
				id: '_internal_command_delegation',
				title: 'bcd'
			}
		}
	};

	setup(function () {
		model = Model.createFromString('test1\ntest2\ntest3', undefined, langId, uri);
		disposables = [model];
	});

	teardown(function () {
		dispose(disposables);
	});

	test('CodeActions are sorted by type, #38623', async function () {

		let expected = [
			// CodeActions with a diagnostics array are shown first
			testData.diagnostics.abc,
			testData.diagnostics.bcd,
			testData.spelling.bcd, // empty diagnostics array

			// CodeActions without a diagnostics or command object
			testData.tsLint.abc,
			testData.tsLint.bcd,

			// CodeActions with a command object are shown last
			testData.command.abc
		];

		const provider = new class implements CodeActionProvider {
			provideCodeActions() {
				return [
					testData.command.abc,
					testData.diagnostics.bcd,
					testData.spelling.bcd,
					testData.tsLint.bcd,
					testData.tsLint.abc,
					testData.diagnostics.abc
				];
			}
		};

		disposables.push(CodeActionProviderRegistry.register('fooLang', provider));

		const actions = await getCodeActions(model, new Range(1, 1, 2, 1));
		assert.equal(actions.length, 6);
		assert.deepEqual(actions, expected);
	});

});
