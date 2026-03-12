const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
    
    // Remove default menu for a cleaner look
    Menu.setApplicationMenu(null);

    // Handle external links to open in default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            require('electron').shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Handle same-window navigation (if needed, though usually new-window is enough for target="_blank")
    win.webContents.on('will-navigate', (event, url) => {
         if (url.startsWith('http:') || url.startsWith('https:')) {
            event.preventDefault();
            require('electron').shell.openExternal(url);
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
