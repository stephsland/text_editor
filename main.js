const { app, BrowserWindow, dialog, Menu, ipcMain, nativeTheme } = require('electron')
const path = require('path')
const isDev = !app.isPackaged
const fs = require('fs')
const docx = require('docx')

function createWindow() {
    // Set dark theme by default
    nativeTheme.themeSource = 'dark';
    
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#1a1a1a'
    })

    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        win.webContents.send('new-document');
                    }
                },
                {
                    label: 'Open',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        dialog.showOpenDialog(win, {
                            filters: [
                                { name: 'Text Documents', extensions: ['txt', 'rtf'] }
                            ]
                        }).then(result => {
                            if (!result.canceled) {
                                win.webContents.send('open-file', result.filePaths[0]);
                            }
                        });
                    }
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        win.webContents.send('save-document');
                    }
                },
                {
                    label: 'Export',
                    submenu: [
                        {
                            label: 'Export as HTML',
                            click: () => {
                                win.webContents.send('export-html');
                            }
                        },
                        {
                            label: 'Export as TXT',
                            click: () => {
                                win.webContents.send('export-txt');
                            }
                        },
                        {
                            label: 'Export as RTF',
                            click: () => {
                                win.webContents.send('export-rtf');
                            }
                        },
                        {
                            label: 'Export as DOCX',
                            click: () => {
                                win.webContents.send('export-docx');
                            }
                        }
                    ]
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Alt+F4',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    win.loadFile(path.join(__dirname, 'src/index.html'))
}

// Function to handle theme changes
function handleThemeChange(event, isDark) {
    nativeTheme.themeSource = isDark ? 'dark' : 'light';
}

app.whenReady().then(() => {
    createWindow();
    
    // Listen for theme changes from renderer
    ipcMain.on('theme-changed', handleThemeChange);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

// Function to read file content
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return { content, path: filePath };
    } catch (error) {
        dialog.showErrorBox('Error', 'Failed to read file');
        return null;
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

ipcMain.on('save-file', async (event, data) => {
    const win = BrowserWindow.getFocusedWindow();
    
    // If path is provided, save directly
    if (data.path) {
        try {
            await fs.promises.writeFile(data.path, data.content);
        } catch (err) {
            dialog.showErrorBox('Error', 'Failed to save file');
        }
        return;
    }

    // Otherwise show save dialog with multiple format options
    dialog.showSaveDialog(win, {
        title: 'Save Document',
        filters: [
            { name: 'Text Document', extensions: ['txt'] },
            { name: 'Rich Text Format', extensions: ['rtf'] },
            { name: 'HTML Document', extensions: ['html'] },
            { name: 'Word Document', extensions: ['docx'] }
        ]
    }).then(async result => {
        if (!result.canceled) {
            if (data.type === 'docx') {
                // Create DOCX document
                const doc = new docx.Document({
                    sections: [{
                        properties: {},
                        children: [
                            new docx.Paragraph({
                                children: [new docx.TextRun(data.content)]
                            })
                        ]
                    }]
                });

                // Generate buffer
                const buffer = await docx.Packer.toBuffer(doc);
                
                // Write buffer to file
                fs.writeFile(result.filePath, buffer, (err) => {
                    if (err) {
                        dialog.showErrorBox('Error', 'Failed to save DOCX file');
                    }
                });
            } else {
                fs.writeFile(result.filePath, data.content, (err) => {
                    if (err) {
                        dialog.showErrorBox('Error', 'Failed to save file');
                    } else {
                        // Send the new file path back to renderer
                        win.webContents.send('file-saved', result.filePath);
                    }
                });
            }
        }
    });
});
