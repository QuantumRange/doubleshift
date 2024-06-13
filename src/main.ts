import {Command, Plugin, TFile} from 'obsidian';
import {DoubleshiftSettings} from './DoubleshiftSettings';
import {Shortcut} from "./Shortcut";

interface Settings {
	delay: number;
	key: string;
	shortcuts: Shortcut[];
}

export function findCommand(a: string): Command {
	let commands = Object.values(this.app.commands.commands);
	for (let i = 0; i < commands.length; i++) {
		// @ts-ignore
		let command: Command = commands[i];
		if (command.id === a || command.name === a) {
			return command;
		}
	}
	return null;
}

const DEFAULT_SETTINGS: Partial<Settings> = {
	delay: 500,
	key: 'Shift',
	shortcuts: [new class implements Shortcut {
		command = 'command-palette:open';
		key = 'Shift';
		lastKeyUpTime = Date.now();
	}]
}

export default class Doubleshift extends Plugin {
	settings: Settings;
	commands: Command[];
	settingsTab: DoubleshiftSettings;

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.refreshCommands();
	}

	refreshCommands() {
		// @ts-ignore
		this.commands = Object.values(this.app.commands.commands);
	}


	async saveSettings() {
		await this.saveData(this.settings);
	}


	async onload() {
		await this.loadSettings();
		this.settingsTab = new DoubleshiftSettings(this.app, this, this.commands);
		this.addSettingTab(this.settingsTab);
		this.registerDomEvent(window, 'keyup', async (event) => await this.doubleshift(event.key));
	}

	async log(file: string, entries: Array<string>) {
		const path = "log/log_" + file
		console.log("Prepare file write ", path, "with params", entries)
		// @ts-ignore
		const f = 		app.vault.getFiles()
			.filter(value => value.name == "log_" + file)
			.first()

		console.log(f)
		if (f == null) {
			await app.vault.create(path, entries.join(";"))
		} else {
			await app.vault.append(f,  "\n" + entries.join(";"))
		}
	}

	async doubleshift(key: string) {
		for (const shortcut of this.settings.shortcuts) {
			await this.log("raw.csv", [key, shortcut.key, shortcut.lastKeyUpTime.toString(), Date.now().toString(), this.settings.delay.toString()])
			await this.log("action.csv", ["START", "key pressed"])

			if (key !== shortcut.key) {
				await this.log("action.csv", ["END", "key not shortcut, resetting time"])
				shortcut.lastKeyUpTime = 0;
				continue;
			}
			if (Date.now() - shortcut.lastKeyUpTime < this.settings.delay) {
				await this.log("action.csv", ["END", "Key within threshold: " + (Date.now() - shortcut.lastKeyUpTime).toString() + " < " + (this.settings.delay)])
				shortcut.lastKeyUpTime = 0;

				// @ts-ignore
				app.commands.executeCommandById(shortcut.command);

			} else {
				await this.log("action.csv", ["END", "Last time key up setting to: " + Date.now().toString()])
				shortcut.lastKeyUpTime = Date.now();
			}
		}
	}
}
