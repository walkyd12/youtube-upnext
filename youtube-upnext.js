// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: play;
/*

~

Welcome to Youtube Up Next. Run this script to set up your widget.

Add or remove items from the widget in the layout section below.

You can duplicate this script to create multiple widgets. Make sure to change the name of the script each time.

Happy scripting!

~

*/

/*
 * CODE
 * Be more careful editing this section.
 * =====================================
 */

// Names of Youtube Up Next elements.
const codeFilename = "youtube-upnext-code"
const gitHubUrl = "https://raw.githubusercontent.com/walkyd12/youtube-upnext/main/youtube-upnext-code.js"

// Determine if the user is using iCloud.
let files = FileManager.local()
const iCloudInUse = files.isFileStoredIniCloud(module.filename)

// If so, use an iCloud file manager.
files = iCloudInUse ? FileManager.iCloud() : files

// Determine if the Youtube Up Next code exists and download if needed.
const pathToCode = files.joinPath(files.documentsDirectory(), codeFilename + ".js")
if (!files.fileExists(pathToCode)) {
    const req = new Request(gitHubUrl)
    const codeString = await req.loadString()
    files.writeString(pathToCode, codeString)
}

// Import the code.
if (iCloudInUse) { await files.downloadFileFromiCloud(pathToCode) }
const code = importModule(codeFilename)

const custom = {

    // Custom items and backgrounds can be added here.

}

// Run the initial setup or settings menu.
let preview
if (config.runsInApp) {
    preview = await code.runSetup(Script.name(), iCloudInUse, codeFilename, gitHubUrl)
    if (!preview) return
}

let channelParam = args && args.widgetParameter ? args.widgetParameter : undefined

// Set up the widget.
let widget;
if (config.runsInWidget) {
    widget = await code.createWidget("Youtube Up Next", channelParam, true);
    Script.setWidget(widget);
}

// If we're in app, display the preview.
if (config.runsInApp) {
    if (preview == "small") {
        widget = await code.createWidget("Youtube Up Next", channelParam, true);
        widget.presentSmall();
    }
}

Script.complete()

