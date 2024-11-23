// Check if we're in Electron environment
const isElectron = typeof require !== 'undefined';
const ipcRenderer = isElectron ? require('electron').ipcRenderer : null;

document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('editor');
    const fontFamily = document.getElementById('font-family');
    const fontSize = document.getElementById('font-size');
    const textColorPicker = document.getElementById('text-color-picker');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');

    // Initialize editor and check for empty state
    function updateEditorState() {
        if (!editor.textContent.trim()) {
            editor.innerHTML = '';
            editor.classList.add('empty');
        } else {
            editor.classList.remove('empty');
            // Ensure cursor is at the end of content
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editor);
            range.collapse(false); // collapse to end
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    // Handle automatic em-dash conversion
    editor.addEventListener('input', (e) => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const node = range.startContainer;
            
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                const position = range.startOffset;
                
                // Check if we just typed a second dash
                if (position >= 2 && text.substring(position - 2, position) === '--') {
                    // Replace the two dashes with an em-dash (using Unicode)
                    const newText = text.substring(0, position - 2) + '\u2014' + text.substring(position);
                    node.textContent = newText;
                    
                    // Restore cursor position
                    range.setStart(node, position - 1);
                    range.setEnd(node, position - 1);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }
    });

    // Initialize editor with focus
    editor.focus();
    updateEditorState();

    // Functions for settings management
    function saveSettings() {
        const settings = {
            theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
            fontSize: fontSize.value,
            fontFamily: fontFamily.value,
            content: editor.innerHTML,
            lastModified: new Date().toISOString(),
            spellcheckEnabled: editor.spellcheck
        };
        localStorage.setItem('editorSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('editorSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);

            // Restore theme
            if (settings.theme === 'dark') {
                document.body.classList.add('dark-mode');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
            }
    
            // Restore font family
            if (settings.fontFamily) {
                fontFamily.value = settings.fontFamily;
            }
    
            // Restore font size
            if (settings.fontSize) {
                fontSize.value = settings.fontSize;
                document.documentElement.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
            }
    
            // Restore content
            if (settings.content) {
                editor.innerHTML = settings.content;
            } else {
                // Set initial span with default font size
                editor.innerHTML = `<span size="7"></span>`;
            }

            // Restore spellcheck state
            if (settings.spellcheckEnabled !== undefined) {
                editor.spellcheck = settings.spellcheckEnabled;
                if (settings.spellcheckEnabled) {
                    document.getElementById('spellcheck-toggle').classList.add('active');
                }
            }
        } else {
            // Set default font size if no settings exist
            editor.innerHTML = `<span style="font-size: ${fontSize.value}px;">Text input...</span>`;
        }
    }

    // Handle font size changes
    fontSize.addEventListener('change', () => {
        const size = fontSize.value;
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (!range.collapsed) {
                // There is selected text
                document.execCommand('styleWithCSS', false, true);
                
                // Create a temporary span with the new font size
                const span = document.createElement('span');
                span.style.fontSize = `${size}px`;
                
                // Get the selected content
                const fragment = range.extractContents();
                span.appendChild(fragment);
                
                // Insert the new span
                range.insertNode(span);
                
                // Restore the selection
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.selectNodeContents(span);
                selection.addRange(newRange);
            } else {
                // No selection, set as default size for new text
                document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
            }
        }
        
        saveSettings();
    });

    // Handle font family changes
    fontFamily.addEventListener('change', () => {
        if (fontFamily.value) {
            document.execCommand('fontName', false, fontFamily.value);
            saveSettings();
        }
    });

    // Handle text color
    document.getElementById('text-color').addEventListener('click', () => {
        textColorPicker.click();
    });

    textColorPicker.addEventListener('input', (e) => {
        document.execCommand('foreColor', false, e.target.value);
        saveSettings();
    });

    // Handle background color
    document.getElementById('bg-color').addEventListener('click', () => {
        bgColorPicker.click();
    });
    
    bgColorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('hiliteColor', false, color);
        saveSettings();
    });

    // Clear highlight and text color functionality
    document.getElementById('clear-highlight').addEventListener('click', () => {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('hiliteColor', false, 'transparent');
        
        // Get default color based on theme
        const defaultColor = document.body.classList.contains('dark-mode') ? 
            getComputedStyle(document.documentElement).getPropertyValue('--default-dark-color').trim() :
            getComputedStyle(document.documentElement).getPropertyValue('--default-light-color').trim();
        
        document.execCommand('foreColor', false, defaultColor);
        saveSettings();
    });

    // Theme toggle functionality
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        const isDarkMode = document.body.classList.contains('dark-mode');
        if (isDarkMode) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
        
        // Notify main process of theme change
        if (isElectron) {
            ipcRenderer.send('theme-changed', isDarkMode);
        }
        
        saveSettings();
    });

    // Handle toolbar buttons
    document.querySelectorAll('.toolbar-button[data-command]').forEach(button => {
        button.addEventListener('click', () => {
            const command = button.getAttribute('data-command');
            document.execCommand(command, false, null);
            button.classList.toggle('active');
            saveSettings();
        });
    });

    // Keep track of button states
    editor.addEventListener('keyup', updateToolbar);
    editor.addEventListener('mouseup', updateToolbar);

    function updateToolbar() {
        document.querySelectorAll('.toolbar-button[data-command]').forEach(button => {
            const command = button.getAttribute('data-command');
            if (document.queryCommandState(command)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // Handle menu events (only in Electron environment)
    if (isElectron) {
        let currentFilePath = null;

        function updateWindowTitle(filePath) {
            const baseTitle = 'Text Editor';
            if (filePath) {
                const fileName = filePath.split('\\').pop();
                document.title = `${fileName} - ${baseTitle}`;
            } else {
                document.title = baseTitle;
            }
        }

        ipcRenderer.on('new-document', () => {
            editor.innerHTML = '';
            currentFilePath = null;
            updateWindowTitle();
            updateEditorState();
            saveSettings();
        });

        ipcRenderer.on('open-file', async (event, filePath) => {
            const result = await ipcRenderer.invoke('read-file', filePath);
            if (result) {
                currentFilePath = result.path;
                if (filePath.toLowerCase().endsWith('.rtf')) {
                    // Create a temporary div to hold the content
                    const temp = document.createElement('div');
                    temp.innerHTML = result.content;
                    editor.innerHTML = temp.innerHTML;
                } else {
                    // Handle plain text
                    editor.innerText = result.content;
                }
                updateWindowTitle(filePath);
                updateEditorState();
                saveSettings();
            }
        });

        ipcRenderer.on('save-document', () => {
            if (currentFilePath) {
                // Save to existing file
                let content = editor.innerHTML;
                const fileType = currentFilePath.split('.').pop().toLowerCase();
                
                // Convert content based on file type
                if (fileType === 'rtf') {
                    // Save the complete HTML content for RTF files
                    content = editor.innerHTML;
                } else if (fileType === 'txt') {
                    content = editor.innerText;
                }
                
                ipcRenderer.send('save-file', {
                    content: content,
                    type: fileType,
                    path: currentFilePath
                });
            } else {
                // Show save dialog for new file
                ipcRenderer.send('save-file', {
                    content: editor.innerHTML
                });
            }
        });

        // Listen for file save completion
        ipcRenderer.on('file-saved', (event, filePath) => {
            currentFilePath = filePath;
            updateWindowTitle(filePath);
            
            // Restore cursor position to end of content
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editor);
            range.collapse(false); // false means collapse to end
            sel.removeAllRanges();
            sel.addRange(range);
            editor.focus();
        });

        ipcRenderer.on('export-html', () => {
            const content = editor.innerHTML;
            ipcRenderer.send('save-file', {
                content: content,
                type: 'html'
            });
        });

        ipcRenderer.on('export-txt', () => {
            const content = editor.innerText;
            ipcRenderer.send('save-file', {
                content: content,
                type: 'txt'
            });
        });

        ipcRenderer.on('export-rtf', () => {
            // Convert HTML to RTF
            const content = editor.innerHTML;
            ipcRenderer.send('save-file', {
                content: content,
                type: 'rtf'
            });
        });

        ipcRenderer.on('export-docx', () => {
            const content = editor.innerText;
            ipcRenderer.send('save-file', {
                content: content,
                type: 'docx'
            });
        });
    }

    // Save content changes with debouncing and update editor state
    editor.addEventListener('input', debounce(() => {
        saveSettings();
        updateEditorState();
    }, 1000));

    // Spell check toggle functionality
    const spellcheckToggle = document.getElementById('spellcheck-toggle');
    
    // Initialize spellcheck based on saved settings
    editor.spellcheck = localStorage.getItem('spellcheckEnabled') !== 'false';
    if (editor.spellcheck) {
        spellcheckToggle.classList.add('active');
    }

    // Blur mode functionality
    const blurToggle = document.getElementById('blur-toggle');
    const blurEnabled = localStorage.getItem('blurEnabled') === 'true';
    
    if (blurEnabled) {
        editor.classList.add('blur-mode');
        blurToggle.classList.add('active');
    }

    blurToggle.addEventListener('click', () => {
        editor.classList.toggle('blur-mode');
        blurToggle.classList.toggle('active');
        localStorage.setItem('blurEnabled', editor.classList.contains('blur-mode'));
    });

    spellcheckToggle.addEventListener('click', () => {
        editor.spellcheck = !editor.spellcheck;
        spellcheckToggle.classList.toggle('active');
        localStorage.setItem('spellcheckEnabled', editor.spellcheck);
    });

    // Todo list functionality
    const todoToggle = document.getElementById('todo-toggle');
    const todoPanel = document.getElementById('todo-panel');
    const todoInput = document.getElementById('todo-input');
    const addTodoBtn = document.getElementById('add-todo');
    const todoList = document.getElementById('todo-list');

    // Load todos from localStorage
    let todos = JSON.parse(localStorage.getItem('todos') || '[]');

    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    function renderTodos() {
        todoList.innerHTML = '';
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.checked = todo.completed;
            checkbox.addEventListener('change', () => toggleTodo(index));

            const text = document.createElement('span');
            text.className = 'todo-text';
            text.textContent = todo.text;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-todo';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => deleteTodo(index));

            li.appendChild(checkbox);
            li.appendChild(text);
            li.appendChild(deleteBtn);
            todoList.appendChild(li);
        });
    }

    function addTodo(text) {
        if (text.trim()) {
            todos.push({ text: text.trim(), completed: false });
            saveTodos();
            renderTodos();
            todoInput.value = '';
        }
    }

    function toggleTodo(index) {
        todos[index].completed = !todos[index].completed;
        saveTodos();
        renderTodos();
    }

    function deleteTodo(index) {
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
    }

    todoToggle.addEventListener('click', () => {
        todoPanel.classList.toggle('hidden');
        todoToggle.classList.toggle('active');
        if (!todoPanel.classList.contains('hidden')) {
            todoInput.focus();
        }
    });

    addTodoBtn.addEventListener('click', () => {
        addTodo(todoInput.value);
    });

    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo(todoInput.value);
        }
    });

    // Initialize todos
    renderTodos();

    // Initialize dark mode and load settings
    if (isElectron) {
        // Notify main process of initial dark theme
        ipcRenderer.send('theme-changed', true);
    }
    loadSettings();

    // Debounce helper function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
});
