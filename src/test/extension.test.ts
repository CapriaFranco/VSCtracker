import * as assert from 'assert';
import * as vscode from 'vscode';

suite('VSCTracker Extension Test Suite', () => {
	suiteSetup(() => {
		// show a message in the test runner
		vscode.window.showInformationMessage('Start VSCTracker tests.');
	});

	test('Commands resolve without throwing', async () => {
		// Commands to test - ensure they don't reject
		const cmds = [
			'VSCtracker.vt.help',
			'VSCtracker.vt.status',
			'VSCtracker.vt.showLocal',
			'VSCtracker.vt.showRemote'
		];

		for (const c of cmds) {
			let threw = false;
			try {
				// executeCommand resolves to any; some commands show messages or write to Output
				await vscode.commands.executeCommand(c);
			} catch (err) {
				threw = true;
			}
			assert.strictEqual(threw, false, `Command ${c} threw an error`);
		}
	});

	test('vt save + vt pull sequence (no throw)', async () => {
		// Force reconcile/save then pull — should not throw even if Firebase not configured
		let ok = true;
		try {
			await vscode.commands.executeCommand('VSCtracker.vt.save');
			await vscode.commands.executeCommand('VSCtracker.vt.pull');
		} catch (err) {
			ok = false;
		}
		assert.strictEqual(ok, true, 'vt save/pull sequence should not throw');
	});
});
