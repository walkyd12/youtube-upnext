// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: magic;

/*

This script contains the logic that allows Youtube Up Next to work. Please do not modify this file. You can add customizations in the widget script.
Documentation is available at https://github.com/walkyd12/youtube-upnext

*/

const youtubeUpNext = {
  // Initialize shared properties.
  initialize(name, iCloudInUse) {
    this.name = name
    this.fm = iCloudInUse ? FileManager.iCloud() : FileManager.local()
    this.prefPath = this.fm.joinPath(
      this.fm.libraryDirectory(),
      'youtube-upnext-' + name,
    )
    this.baseUrl = 'https://www.googleapis.com/youtube/v3'
    this.widgetUrl =
      'https://raw.githubusercontent.com/walkyd12/youtube-upnext/main/youtube-upnext-code.js'
    this.youtubeLogoUrl =
      'https://raw.githubusercontent.com/walkyd12/youtube-upnext/main/logo/yt_icon_rgb.png'
    this.now = new Date()
    this.data = {}
    this.initialized = true
  },

  // Determine what to do when Youtube Up Next is run.
  async runSetup(name, iCloudInUse, codeFilename, gitHubUrl) {
    if (!this.initialized) this.initialize(name, iCloudInUse)

    if (
      !this.fm.fileExists(
        this.fm.joinPath(this.fm.libraryDirectory(), 'youtube-upnext-setup'),
      )
    )
      return await this.initialSetup()
    return await this.editSettings(codeFilename, gitHubUrl)
  },

  // Run the initial setup.
  async initialSetup() {
    let message, options
    if (!false) {
      message =
        'Welcome to "' +
        this.name +
        '". Make sure your script has the name you want before you begin.'
      options = ['I like the name "' + this.name + '"', 'Let me go change it']
      if (await this.generateAlert(message, options)) return
    }

    message =
      'To display Youtube video previews on your widget, you need an YouTube Data API V3 key.'
    options = ['I already have a key', 'I need to get a key']
    const youtubeKey = await this.generateAlert(message, options)

    // Show a web view to claim the API key.
    if (youtubeKey == 1) {
      message =
        'On the next screen, sign up for YouTube Data API V3. Find the API key, copy it, and close the web view. You will then be prompted to paste in the key.'
      await this.generateAlert(message, ['Continue'])

      const webView = new WebView()
      webView.loadURL(
        'https://developers.google.com/youtube/v3/getting-started',
      )
      await webView.present()
    }

    // We need the API key if we're showing data.
    if (!(await this.setApiKey(true))) {
      return
    }

    this.writePreference('youtube-upnext-setup', 'true')

    message =
      "Your widget is ready! You'll now see a preview. Re-run this script to edit the default preferences, including localization. When you're ready, add a Scriptable widget to the home screen and select this script."
    await this.generateAlert(message, ['Show preview'])
    return this.previewValue()
  },

  // Edit the widget settings.
  async editSettings(codeFilename, gitHubUrl) {
    const menu = {
      preview: 'Show widget preview',
      preferences: 'Edit preferences',
      background: 'Change background',
      update: 'Update code',
      other: 'Other settings',
      exit: 'Exit settings menu',
    }
    const menuOptions = [
      menu.preview,
      menu.preferences,
      menu.background,
      menu.update,
      menu.other,
      menu.exit,
    ]
    const response =
      menuOptions[await this.generateAlert('Widget Setup', menuOptions)]

    if (response == menu.preview) {
      return this.previewValue()
    }
    if (response == menu.background) {
      return await this.setWidgetBackground()
    }
    if (response == menu.preferences) {
      return await this.editPreferences()
    }

    if (response == menu.update) {
      if (
        await this.generateAlert(
          'Would you like to update the Weather Cal code? Your widgets will not be affected.',
          ['Update', 'Exit'],
        )
      )
        return
      const success = await this.downloadCode(codeFilename, gitHubUrl)
      return await this.generateAlert(
        success
          ? 'The update is now complete.'
          : 'The update failed. Please try again later.',
      )
    }

    if (response == menu.other) {
      const otherOptions = [
        'Re-enter API key',
        'Completely reset widget',
        'Exit',
      ]
      const otherResponse = await this.generateAlert(
        'Other settings',
        otherOptions,
      )

      // Set the API key.
      if (otherResponse == 0) {
        await this.setApiKey()
      }

      // Reset the widget.
      else if (otherResponse == 1) {
        const alert = new Alert()
        alert.message = 'Are you sure you want to completely reset this widget?'
        alert.addDestructiveAction('Reset')
        alert.addAction('Cancel')

        if ((await alert.present()) == 0) {
          for (item of this.fm.listContents(this.fm.libraryDirectory())) {
            if (
              item.startsWith('youtube-upnext-') &&
              item != 'youtube-upnext-api-key' &&
              item != 'youtube-upnext-setup'
            ) {
              this.fm.remove(this.fm.joinPath(this.fm.libraryDirectory(), item))
            }
          }
          const success = await this.downloadCode(this.name, this.widgetUrl)
          const message = success
            ? 'This script has been reset. Close the script and reopen it for the change to take effect.'
            : 'The reset failed.'
          await this.generateAlert(message)
        }
      }
    }
    return
  },

  // Download a Scriptable script.
  async downloadCode(filename, url) {
    try {
      const codeString = await new Request(url).loadString()
      if (codeString.indexOf('// Variables used by Scriptable.') < 0) {
        return false
      } else {
        this.fm.writeString(
          this.fm.joinPath(this.fm.documentsDirectory(), filename + '.js'),
          codeString,
        )
        return true
      }
    } catch {
      return false
    }
  },

  // Edit preferences of the widget.
  async editPreferences() {
    const settingsObject = await this.getSettings(true)
    const table = new UITable()
    table.showSeparators = true

    for (categoryKey in settingsObject) {
      const row = new UITableRow()
      row.dismissOnSelect = false

      const category = settingsObject[categoryKey]
      row.addText(category.name)
      row.onSelect = async () => {
        const subTable = new UITable()
        subTable.showSeparators = true
        await this.loadPrefsTable(subTable, category)
        await subTable.present()
      }
      table.addRow(row)
    }
    await table.present()

    for (categoryKey in settingsObject) {
      for (item in settingsObject[categoryKey]) {
        if (item == 'name') continue
        settingsObject[categoryKey][item] =
          settingsObject[categoryKey][item].val
      }
    }
    this.writePreference(null, settingsObject, this.prefPath)
  },

  // Load or reload a table full of preferences.
  async loadPrefsTable(table, category) {
    table.removeAllRows()
    for (settingName in category) {
      if (settingName == 'name') continue

      const row = new UITableRow()
      row.dismissOnSelect = false
      row.height = 55

      const setting = category[settingName]

      let valText
      if (Array.isArray(setting.val)) {
        valText = setting.val.map((a) => a.title).join(', ')
      } else if (setting.type == 'fonts') {
        const item = setting.val
        const size = item.size.length ? `size ${item.size}` : ''
        const font = item.font.length ? ` ${item.font}` : ''
        const color = item.color.length
          ? ` (${item.color}${item.dark.length ? '/' + item.dark : ''})`
          : ''
        const caps =
          item.caps.length && item.caps != this.enum.caps.none
            ? ` - ${item.caps}`
            : ''
        valText = size + font + color + caps
      } else if (typeof setting.val == 'object') {
        for (subItem in setting.val) {
          const setupText = subItem + ': ' + setting.val[subItem]
          valText = (valText ? valText + ', ' : '') + setupText
        }
      } else {
        valText = setting.val + ''
      }

      const cell = row.addText(setting.name, valText)
      cell.subtitleColor = Color.gray()

      // If there's no type, it's just text.
      if (!setting.type) {
        row.onSelect = async () => {
          const returnVal = await this.promptForText(
            setting.name,
            [setting.val],
            [],
            setting.description,
          )
          setting.val = returnVal.textFieldValue(0).trim()
          await this.loadPrefsTable(table, category)
        }
      } else if (setting.type == 'enum') {
        row.onSelect = async () => {
          const returnVal = await this.generateAlert(
            setting.name,
            setting.options,
            setting.description,
          )
          setting.val = setting.options[returnVal]
          await this.loadPrefsTable(table, category)
        }
      } else if (setting.type == 'bool') {
        row.onSelect = async () => {
          const returnVal = await this.generateAlert(
            setting.name,
            ['true', 'false'],
            setting.description,
          )
          setting.val = !returnVal
          await this.loadPrefsTable(table, category)
        }
      } else if (setting.type == 'fonts') {
        row.onSelect = async () => {
          const keys = ['size', 'color', 'dark', 'font']
          const values = []
          for (key of keys) values.push(setting.val[key])

          const options = ['Capitalization', 'Save and Close']
          const prompt = await this.generatePrompt(
            setting.name,
            setting.description,
            options,
            values,
            keys,
          )
          const returnVal = await prompt.present()

          if (returnVal) {
            for (let i = 0; i < keys.length; i++) {
              setting.val[keys[i]] = prompt.textFieldValue(i).trim()
            }
          } else {
            const capOptions = [
              this.enum.caps.upper,
              this.enum.caps.lower,
              this.enum.caps.title,
              this.enum.caps.none,
            ]
            setting.val['caps'] =
              capOptions[await this.generateAlert('Capitalization', capOptions)]
          }

          await this.loadPrefsTable(table, category)
        }
      } else if (setting.type == 'multival') {
        row.onSelect = async () => {
          // We need an ordered set.
          const map = new Map(Object.entries(setting.val))
          const keys = Array.from(map.keys())
          const returnVal = await this.promptForText(
            setting.name,
            Array.from(map.values()),
            keys,
            setting.description,
          )
          for (let i = 0; i < keys.length; i++) {
            setting.val[keys[i]] = returnVal.textFieldValue(i).trim()
          }
          await this.loadPrefsTable(table, category)
        }
      } else if (setting.type == 'multiselect') {
        row.onSelect = async () => {
          // We need to pass sets to the function.
          const options = new Set(setting.options)
          const selected = new Set(
            setting.val.map ? setting.val.map((a) => a.identifier) : [],
          )
          const multiTable = new UITable()

          await this.loadMultiTable(multiTable, options, selected)
          await multiTable.present()

          setting.val = [...options].filter((option) =>
            [...selected].includes(option.identifier),
          )
          await this.loadPrefsTable(table, category)
        }
      }
      table.addRow(row)
    }
    table.reload()
  },

  // Load or reload a table with multi-select rows.
  async loadMultiTable(table, options, selected) {
    table.removeAllRows()
    for (const item of options) {
      const row = new UITableRow()
      row.dismissOnSelect = false
      row.height = 55

      const isSelected = selected.has(item.identifier)
      row.backgroundColor = isSelected
        ? Color.dynamic(new Color('d8d8de'), new Color('2c2c2c'))
        : Color.dynamic(Color.white(), new Color('151517'))

      if (item.color) {
        const colorCell = row.addText(isSelected ? '\u25CF' : '\u25CB')
        colorCell.titleColor = item.color
        colorCell.widthWeight = 1
      }

      const titleCell = row.addText(item.title)
      titleCell.widthWeight = 15

      row.onSelect = async () => {
        if (isSelected) {
          selected.delete(item.identifier)
        } else {
          selected.add(item.identifier)
        }
        await this.loadMultiTable(table, options, selected)
      }
      table.addRow(row)
    }
    table.reload()
  },

  // Get the youtube data api v3 key, optionally determining if it's the first run.
  async setApiKey(firstRun = false) {
    const returnVal = await this.promptForText(
      'Paste your API key in the box below.',
      [''],
      ['82c29fdbgd6aebbb595d402f8a65fabf'],
    )
    const apiKey = returnVal.textFieldValue(0)
    if (!apiKey || apiKey == '' || apiKey == null) {
      return await this.generateAlert(
        'No API key was entered. Try copying the key again and re-running this script.',
        ['Exit'],
      )
    }
    this.writePreference('youtube-upnext-api-key', apiKey)

    const apiKeyTest = await this.getYoutubeDataApiKey(apiKey)
    if (apiKeyTest) {
      await this.generateAlert('The API key worked and was saved.', [
        firstRun ? 'Continue' : 'OK',
      ])
    } else {
      await this.generateAlert(
        'The key you entered, ' +
          apiKeyTest +
          ", didn't work. If it's a new key, it may take a few hours to activate.",
      )
      return
    }
    return true
  },

  // Get the API path, or the test response if a new API key is provided.
  async getYoutubeDataApiKey(newApiKey) {
    const apiKey =
      newApiKey ||
      this.fm.readString(
        this.fm.joinPath(this.fm.libraryDirectory(), 'youtube-upnext-api-key'),
      )

    async function checkApiKey(key) {
      const req = new Request(
        `${this.baseUrl}/search?part=snippet&channelId=UCLc1NRldPFA6lI3It3JMBVA&maxResults=10&order=date&type=video&key=${key}`,
      )
      let response
      console.log(`Testing api key...response ${response}`)
      try {
        response = await req.loadJSON()
      } catch {}
      return response
    }

    if (newApiKey) {
      let apiResponse = await checkApiKey(newApiKey)
      if (apiResponse) {
        if (apiResponse.error) {
          return
        } else {
          return newApiKey
        }
      } else {
        return
      }
    }

    return apiKey
  },

  // Set the background of the widget.
  async setWidgetBackground() {
    const options = ['Solid color', 'Automatic gradient', 'Custom gradient']
    const backgroundType = await this.generateAlert(
      'What type of background would you like for your widget?',
      options,
    )

    const background = this.fm.fileExists(this.bgPath)
      ? JSON.parse(this.fm.readString(this.bgPath))
      : {}
    if (backgroundType == 0) {
      background.type = 'color'
      const returnVal = await this.promptForText(
        'Background Color',
        [background.color, background.dark],
        ['Default color', 'Dark mode color (optional)'],
        'Enter the hex value of the background color you want. You can optionally choose a different background color for dark mode.',
      )
      background.color = returnVal.textFieldValue(0)
      background.dark = returnVal.textFieldValue(1)
    } else if (backgroundType == 1) {
      background.type = 'auto'
    } else if (backgroundType == 2) {
      background.type = 'gradient'
      const returnVal = await this.promptForText(
        'Gradient Colors',
        [
          background.initialColor,
          background.finalColor,
          background.initialDark,
          background.finalDark,
        ],
        [
          'Top default color',
          'Bottom default color',
          'Top dark mode color',
          'Bottom dark mode color',
        ],
        'Enter the hex values of the colors for your gradient. You can optionally choose different background colors for dark mode.',
      )
      background.initialColor = returnVal.textFieldValue(0)
      background.finalColor = returnVal.textFieldValue(1)
      background.initialDark = returnVal.textFieldValue(2)
      background.finalDark = returnVal.textFieldValue(3)
    }

    this.writePreference(null, background, this.bgPath)
    return this.previewValue()
  },

  // Get the current settings for the widget or for editing.
  async getSettings(forEditing = false) {
    let settingsFromFile
    if (this.fm.fileExists(this.prefPath)) {
      settingsFromFile = JSON.parse(this.fm.readString(this.prefPath))
    }

    const settingsObject = await this.defaultSettings()
    for (category in settingsObject) {
      for (item in settingsObject[category]) {
        // If the setting exists, use it. Otherwise, the default is used.
        let value =
          settingsFromFile && settingsFromFile[category]
            ? settingsFromFile[category][item]
            : undefined
        if (value == undefined) {
          value = settingsObject[category][item].val
        }

        // Format the object correctly depending on where it will be used.
        if (forEditing) {
          settingsObject[category][item].val = value
        } else {
          settingsObject[category][item] = value
        }
      }
    }
    return settingsObject
  },

  // Return the size of the widget preview.
  previewValue() {
    if (this.fm.fileExists(this.prefPath)) {
      const settingsObject = JSON.parse(this.fm.readString(this.prefPath))
      return settingsObject.widget.preview
    } else {
      return 'small'
    }
  },

  // Return
  refreshRate() {
    if (this.fm.fileExists(this.prefPath)) {
      const settingsObject = JSON.parse(this.fm.readString(this.prefPath))
      return parseInt(settingsObject.widget.refreshRate)
    } else {
      return 60
    }
  },

  // Download a Scriptable script.
  async downloadCode(filename, url) {
    try {
      const codeString = await new Request(url).loadString()
      if (codeString.indexOf('// Variables used by Scriptable.') < 0) {
        return false
      } else {
        this.fm.writeString(
          this.fm.joinPath(this.fm.documentsDirectory(), filename + '.js'),
          codeString,
        )
        return true
      }
    } catch {
      return false
    }
  },

  // Generate an alert with the provided array of options.
  async generateAlert(title, options, message) {
    return await this.generatePrompt(title, message, options)
  },

  // Default prompt for text field values.
  async promptForText(title, values, keys, message) {
    return await this.generatePrompt(title, message, null, values, keys)
  },

  // Generic implementation of an alert.
  async generatePrompt(title, message, options, textvals, placeholders) {
    const alert = new Alert()
    alert.title = title
    if (message) alert.message = message

    const buttons = options || ['OK']
    for (button of buttons) {
      alert.addAction(button)
    }

    if (!textvals) {
      return await alert.presentAlert()
    }

    for (i = 0; i < textvals.length; i++) {
      alert.addTextField(
        placeholders && placeholders[i] ? placeholders[i] : null,
        (textvals[i] || '') + '',
      )
    }

    if (!options) await alert.present()
    return alert
  },

  // Write the value of a preference to disk.
  writePreference(name, value, inputPath = null) {
    const preference = typeof value == 'string' ? value : JSON.stringify(value)
    this.fm.writeString(
      inputPath || this.fm.joinPath(this.fm.libraryDirectory(), name),
      preference,
    )
  },

  /*
   * Widget construction
   * -------------------------------------------- */

  // Create and return the widget.
  async createWidget(name, channelHandle, iCloudInUse) {
    if (!this.initialized) this.initialize(name, iCloudInUse)

    const widget = new ListWidget()

    // widget.setPadding(4, 4, 4, 4)

    const titleStack = widget.addStack()
    titleStack.layoutHorizontally()
    titleStack.centerAlignContent()

    const bodyStack = widget.addStack()
    bodyStack.layoutVertically()
    bodyStack.centerAlignContent()

    console.log('Stacks initialized. Loading data')

    const logo = await this.readLogo()
    if (logo) {
      const logoThumbnail = titleStack.addImage(logo)
      logoThumbnail.imageSize = new Size(30, 30)
      titleStack.addSpacer(4)
    }

    if (!channelHandle) {
      const errorText = widget.addText(
        "No channel handle found! Long press on the widget and fill in the 'Parameter' field with a Youtube Channel handle",
      )
      errorText.font = Font.ultraLightSystemFont(12)
      errorText.textColor = Color.yellow()

      return widget
    }

    const videoDataResp = await this.getLatestVideo(channelHandle)
    const videoData = videoDataResp[0]
    const error = videoDataResp[1]

    if (error || !videoData) {
      console.log(`Error fetching video data ${videoData}`)
    } else {
      console.log('Fetched video Data!')
    }

    if (videoData) {
      const titleText = titleStack.addText(videoData.channelTitle)
      const videoTitleText = bodyStack.addText(videoData.videoTitle)
      videoTitleText.font = Font.ultraLightSystemFont(12)
      if (videoData.thumbnail) {
        const imgRequest = new Request(videoData.thumbnail)
        imgResult = await imgRequest.loadImage()
        const imgThumbnail = bodyStack.addImage(imgResult)
        imgThumbnail.cornerRadius = 12
        imgThumbnail.applyFillingContentMode()
      }
    } else {
      let errorText
      if (error) {
        errorText = widget.addText(error)
      } else {
        errorText = widget.addText(
          `Failed to fetch video data for ${channelHandle}`,
        )
      }
      errorText.font = Font.ultraLightSystemFont(12)
      errorText.textColor = Color.yellow()
    }

    return widget
  },

  /*
   * Data setup functions
   * -------------------------------------------- */

  async getChannelId(channelName) {
    const apiKey = await this.getYoutubeDataApiKey()

    const url = `${this.baseUrl}/channels?forHandle=${channelName}&part=id&key=${apiKey}`
    const request = new Request(url)
    const response = await request.loadJSON()

    if (response && response.items) {
      return [response.items[0].id, undefined]
    } else if (response) {
      return [undefined, response.error.message]
    }
    return [undefined, undefined]
  },

  async getLatestVideo(channelName) {
    const apiKey = await this.getYoutubeDataApiKey()

    const channelCache = this.checkCache(channelName)
    if (channelCache) {
      const lastCacheUpdate = channelCache.lastUpdate
      console.log(`Found last cache update ${Date.parse(lastCacheUpdate)}`)
      console.log(
        `Diff in time ${(new Date() - Date.parse(lastCacheUpdate)) / 60000}`,
      )
      const refreshRateMs = this.refreshRate() * 60000
      if (new Date() - Date.parse(lastCacheUpdate) < refreshRateMs) {
        console.log(
          `Cache is valid. Return cache value ${JSON.stringify(
            channelCache.videoData,
          )}`,
        )
        return [channelCache.videoData, undefined]
      }
      console.log('Cache is invalid, fetch latest video')
    }

    const channelResp = await this.getChannelId(channelName)
    const channelId = channelResp[0]
    const errorCid = channelResp[1]
    if (!channelId) return [undefined, errorCid]
    const url = `${this.baseUrl}/search?part=snippet&channelId=${channelId}&maxResults=1&order=date&type=video&key=${apiKey}`
    const request = new Request(url)
    const response = await request.loadJSON()

    if (response && response.items) {
      const videoTitle = response.items[0].snippet.title
      const channelTitle = response.items[0].snippet.channelTitle
      const publishTime = response.items[0].snippet.publishedAt
      const thumbnail = response.items[0].snippet.thumbnails.medium.url
      const url = `https://www.youtube.com/watch?v=${response.items[0].id.videoId}`
      const videoData = {
        videoTitle: videoTitle,
        channelTitle: channelTitle,
        publishTime: publishTime,
        thumbnail: thumbnail,
        url: url,
      }
      this.writeCache(channelName, channelId, videoData)
      return [videoData, undefined]
    } else if (response) {
      return [undefined, response.error.message]
    }
    return [undefined, undefined]
  },

  checkCache(channelName) {
    console.log('Checking cache')
    const cachePath = this.fm.joinPath(
      this.fm.libraryDirectory(),
      `youtube-upnext-cache-${channelName}`,
    )
    if (this.fm.fileExists(cachePath)) {
      return JSON.parse(this.fm.readString(cachePath))
    }
    return
  },

  writeCache(channelName, channelId, videoData) {
    console.log(`Writing cache ${new Date().toString()}`)
    const videoCache = {
      channelId: channelId,
      videoData: videoData,
      lastUpdate: new Date(),
    }
    this.writePreference(`youtube-upnext-cache-${channelName}`, videoCache)
  },

  async saveLogo(logoDir, logoFilename) {
    const request = new Request(this.youtubeLogoUrl)
    const result = await request.loadImage()
    if (!this.fm.isDirectory(logoDir)) {
      this.fm.createDirectory(logoDir, true)
    }
    const localImagePath = `${logoDir}/${logoFilename}`
    this.fm.writeImage(localImagePath, result)
    console.log(`Saved youtube logo image to ${localImagePath}`)
  },

  async readLogo() {
    const logoDir = '/logo'
    const logoFilename = 'yt_icon_rgb.png'
    const localImagePath = this.fm.joinPath(
      this.fm.documentsDirectory(),
      `${logoDir}/${logoFilename}`,
    )
    console.log(`Trying to find image at ${localImagePath}`)
    if (!this.fm.fileExists(localImagePath)) {
      console.log('No saved youtube logo file found, saving')
      await this.saveLogo(
        this.fm.joinPath(this.fm.documentsDirectory(), logoDir),
        logoFilename,
      )
    }
    return this.fm.readImage(localImagePath)
  },

  /*
   * Helper functions
   * -------------------------------------------- */

  // Return the default widget settings.
  async defaultSettings() {
    const settings = {
      widget: {
        name: 'Overall settings',
        preview: {
          val: 'large',
          name: 'Widget preview size',
          description:
            'Set the size of the widget preview displayed in the app. More sizes to come!',
          type: 'enum',
          options: ['small'],
        },
        refreshRate: {
          val: '60',
          name: 'Data refresh rate',
          description:
            'Set the rate (in minutes) at which data is fetched from the Youtube Data API. Increase rate to avoid hitting quota',
          type: 'enum',
          options: ['15', '30', '60', '120', '1440'],
        },
      },
    }

    return settings
  },
}

module.exports = youtubeUpNext

/*
 * Detect the current module
 * by Raymond Velasquez @supermamon
 * -------------------------------------------- */

const moduleName = module.filename.match(/[^\/]+$/)[0].replace('.js', '')
if (moduleName == Script.name()) {
  await (async () => {
    // Comment out the return to run a test.
    // return

    const name = 'Youtube Up Next Builder'
    const isSetup = await youtubeUpNext.runSetup(
      name,
      true,
      'Youtube Up Next code',
      'https://raw.githubusercontent.com/walkyd12/youtube-upnext/main/youtube-upnext-code.js',
    )
    const w = await youtubeUpNext.createWidget(name, 'toshshow', true)
    w.presentSmall()
    Script.complete()
  })()
}

/*
 * Don't modify the characters below this line.
 * -------------------------------------------- */
//4

