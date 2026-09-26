// Document Management
let currentDocId = null;
let documents = JSON.parse(localStorage.getItem('localdocs_documents')) || {};
let history = [];
let historyStep = 0;
let autoSaveInterval;

// Templates
const templates = {
    letter: `[Your Address]
[Date]

[Recipient Name]
[Recipient Address]

Dear [Recipient Name],

[Opening paragraph - Start typing here]

[Body paragraphs]

Sincerely,
[Your Name]`,
    report: `REPORT TITLE
[Date]

Executive Summary
[Brief overview]

Introduction
[Introduction content]

Findings
[Key findings]

Conclusion
[Conclusion]

Recommendations
[Recommendations]`,
    resume: `[YOUR NAME]
[Email] | [Phone] | [LinkedIn]

PROFESSIONAL SUMMARY
[Summary]

EXPERIENCE
[Company Name] - [Position]
• Achievement 1
• Achievement 2

EDUCATION
[School Name] - [Degree]

SKILLS
[Skill 1, Skill 2, Skill 3]`,
    notes: `MEETING NOTES
Date: [Date]
Attendees: [Names]

AGENDA
• [Topic 1]
• [Topic 2]

DISCUSSION POINTS
[Points]

ACTION ITEMS
☐ [Task 1]
☐ [Task 2]

NEXT MEETING
[Date and Time]`
};

// Initialize
function init() {
    if (Object.keys(documents).length === 0) {
        createNewDocument('Untitled Document');
    } else {
        loadLatestDocument();
    }
    attachEventListeners();
    setupAutoSave();
}

function createNewDocument(name) {
    const docId = Date.now().toString();
    documents[docId] = {
        id: docId,
        title: name,
        content: '',
        created: new Date().toLocaleString(),
        modified: new Date().toLocaleString()
    };
    currentDocId = docId;
    saveDocuments();
    loadDocument(docId);
}

function loadLatestDocument() {
    const docIds = Object.keys(documents);
    if (docIds.length > 0) {
        currentDocId = docIds[0];
        loadDocument(currentDocId);
    }
}

function loadDocument(docId) {
    const doc = documents[docId];
    if (doc) {
        currentDocId = docId;
        document.getElementById('docTitle').value = doc.title;
        document.getElementById('editor').innerHTML = doc.content;
        history = [doc.content];
        historyStep = 0;
        updateStats();
    }
}

function saveDocument() {
    if (!currentDocId) return;
    const doc = documents[currentDocId];
    doc.title = document.getElementById('docTitle').value || 'Untitled Document';
    doc.content = document.getElementById('editor').innerHTML;
    doc.modified = new Date().toLocaleString();
    saveDocuments();
    document.getElementById('lastSaved').textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
}

function saveDocuments() {
    localStorage.setItem('localdocs_documents', JSON.stringify(documents));
}

function deleteDocument(docId) {
    if (confirm('Are you sure you want to delete this document?')) {
        delete documents[docId];
        saveDocuments();
        if (currentDocId === docId) {
            loadLatestDocument();
        }
        displayDocuments();
    }
}

// Export Functions
function exportPDF() {
    const editor = document.getElementById('editor');
    const title = document.getElementById('docTitle').value;
    const html = `<h1>${title}</h1><div>${editor.innerHTML}</div>`;
    
    const opt = {
        margin: 10,
        filename: `${title || 'document'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    html2pdf().set(opt).from(html).save();
    showNotification('PDF exported successfully!');
}

function exportTXT() {
    const editor = document.getElementById('editor');
    const title = document.getElementById('docTitle').value;
    const text = editor.innerText;
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `${title || 'document'}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showNotification('TXT exported successfully!');
}

function exportDOCX() {
    const editor = document.getElementById('editor');
    const title = document.getElementById('docTitle').value;
    const html = `<h1>${title}</h1><div>${editor.innerHTML}</div>`;
    
    try {
        const docx = HtmlDocx.asBlob(html);
        const url = URL.createObjectURL(docx);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title || 'document'}.docx`;
        link.click();
        showNotification('DOCX exported successfully!');
    } catch (error) {
        showNotification('Error exporting DOCX', 'error');
    }
}

function exportAllDocs() {
    const data = JSON.stringify(documents, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(data));
    element.setAttribute('download', `localdocs_backup_${new Date().getTime()}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showNotification('All documents exported!');
}

function importDocs() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                documents = { ...documents, ...imported };
                saveDocuments();
                loadLatestDocument();
                showNotification('Documents imported successfully!');
            } catch (error) {
                showNotification('Error importing documents!', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// UI Functions
function displayDocuments() {
    const docsList = document.getElementById('docsList');
    const searchTerm = document.getElementById('searchDocs').value.toLowerCase();
    docsList.innerHTML = '';
    
    Object.values(documents)
        .sort((a, b) => new Date(b.modified) - new Date(a.modified))
        .filter(doc => doc.title.toLowerCase().includes(searchTerm))
        .forEach(doc => {
            const card = document.createElement('div');
            card.className = 'doc-card';
            const preview = doc.content.replace(/<[^>]*>/g, '').substring(0, 50);
            card.innerHTML = `
                <h3>${escapeHtml(doc.title)}</h3>
                <p>${doc.modified}</p>
                <p style="font-size: 11px; color: #bbb; height: 30px; overflow: hidden;">${preview}${preview.length > 50 ? '...' : ''}</p>
                <div class="doc-card-buttons">
                    <button onclick="loadDocumentAndCloseModal('${doc.id}')">Open</button>
                    <button class="delete-btn" onclick="deleteDocument('${doc.id}')">Delete</button>
                </div>
            `;
            docsList.appendChild(card);
        });
}

function loadDocumentAndCloseModal(docId) {
    loadDocument(docId);
    closeDocsModal();
}

function closeDocsModal() {
    document.getElementById('docsModal').classList.remove('active');
}

function openNewDocModal() {
    document.getElementById('newDocModal').classList.add('active');
    document.getElementById('newDocName').focus();
}

function closeNewDocModal() {
    document.getElementById('newDocModal').classList.remove('active');
}

function createNewDoc() {
    const name = document.getElementById('newDocName').value || 'Untitled Document';
    createNewDocument(name);
    closeNewDocModal();
    document.getElementById('newDocName').value = '';
}

function closeTableModal() {
    document.getElementById('tableModal').classList.remove('active');
}

function insertTableDialog() {
    document.getElementById('tableModal').classList.add('active');
    document.getElementById('tableRows').focus();
}

function insertTable() {
    const rows = parseInt(document.getElementById('tableRows').value);
    const cols = parseInt(document.getElementById('tableCols').value);
    
    let table = '<table border="1" style="border-collapse: collapse; width: 100%;"><tbody>';
    
    for (let i = 0; i < rows; i++) {
        table += '<tr>';
        for (let j = 0; j < cols; j++) {
            table += `<td style="padding: 8px; border: 1px solid #ddd;">Cell ${i + 1},${j + 1}</td>`;
        }
        table += '</tr>';
    }
    
    table += '</tbody></table><br>';
    
    insertAtCursor(table);
    closeTableModal();
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

function clearAllData() {
    if (confirm('Are you sure? This will delete ALL documents permanently!')) {
        localStorage.removeItem('localdocs_documents');
        documents = {};
        createNewDocument('Untitled Document');
        showNotification('All data cleared!');
    }
}

// Template Functions
function loadTemplate(templateName) {
    const content = templates[templateName];
    document.getElementById('editor').innerHTML = content;
    document.getElementById('docTitle').value = templateName.charAt(0).toUpperCase() + templateName.slice(1);
    updateStats();
    saveToHistory();
    saveDocument();
    showNotification(`${templateName} template loaded!`);
}

// Quick Insert Functions
function insertDate() {
    const date = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    insertAtCursor(date);
}

function insertTime() {
    const time = new Date().toLocaleTimeString();
    insertAtCursor(time);
}

function insertPageBreak() {
    insertAtCursor('<div style="page-break-after: always; margin: 20px 0; border-bottom: 2px dashed #ccc; padding-bottom: 20px;"></div>');
}

function insertAtCursor(html) {
    const editor = document.getElementById('editor');
    editor.focus();
    
    if (window.getSelection) {
        const sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            
            const el = document.createElement('div');
            el.innerHTML = html;
            const frag = document.createDocumentFragment();
            let node, lastNode;
            while ((node = el.firstChild)) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);
            
            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
    
    saveToHistory();
    saveDocument();
}

// Formatting Functions
function applyFormatting(format) {
    const editor = document.getElementById('editor');
    document.execCommand('defaultParagraphSeparator', false, 'p');
    
    switch(format) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'strike':
            document.execCommand('strikethrough', false, null);
            break;
        case 'h1':
            document.execCommand('formatBlock', false, '<h1>');
            break;
        case 'h2':
            document.execCommand('formatBlock', false, '<h2>');
            break;
        case 'h3':
            document.execCommand('formatBlock', false, '<h3>');
            break;
        case 'ul':
            document.execCommand('insertUnorderedList', false, null);
            break;
        case 'ol':
            document.execCommand('insertOrderedList', false, null);
            break;
        case 'quote':
            document.execCommand('formatBlock', false, '<blockquote>');
            break;
        case 'left':
            document.execCommand('justifyLeft', false, null);
            break;
        case 'center':
            document.execCommand('justifyCenter', false, null);
            break;
        case 'right':
            document.execCommand('justifyRight', false, null);
            break;
    }
    
    editor.focus();
    saveToHistory();
    saveDocument();
}

function changeFontFamily() {
    const family = document.getElementById('fontFamily').value;
    document.execCommand('fontName', false, family);
    document.getElementById('editor').focus();
}

function changeFontSize() {
    const size = document.getElementById('fontSize').value;
    document.execCommand('fontSize', false, size);
    document.getElementById('editor').focus();
}

function changeTextColor() {
    const color = document.getElementById('textColor').value;
    document.execCommand('foreColor', false, color);
    document.getElementById('editor').focus();
}

function changeBackgroundColor() {
    const color = document.getElementById('bgColor').value;
    document.execCommand('hiliteColor', false, color);
    document.getElementById('editor').focus();
}

function clearFormatting() {
    document.execCommand('removeFormat', false, null);
    document.execCommand('formatBlock', false, '<p>');
    document.getElementById('editor').focus();
    saveToHistory();
    saveDocument();
}

// History Management (Undo/Redo)
function saveToHistory() {
    const content = document.getElementById('editor').innerHTML;
    if (history[historyStep] !== content) {
        history = history.slice(0, historyStep + 1);
        history.push(content);
        historyStep++;
        
        // Limit history to 50 steps
        if (history.length > 50) {
            history.shift();
            historyStep--;
        }
    }
}

function undo() {
    if (historyStep > 0) {
        historyStep--;
        document.getElementById('editor').innerHTML = history[historyStep];
        saveDocument();
    }
}

function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        document.getElementById('editor').innerHTML = history[historyStep];
        saveDocument();
    }
}

// Word & Character Count
function updateStats() {
    const editor = document.getElementById('editor');
    const text = editor.innerText;
    const html = editor.innerHTML;
    
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const readTime = Math.ceil(words / 200);
    
    document.getElementById('wordCount').textContent = `Words: ${words}`;
    document.getElementById('charCount').textContent = `Characters: ${chars}`;
    document.getElementById('readTime').textContent = `Read time: ${readTime} min`;
}

// Notification System
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    if (type === 'error') {
        notification.style.background = '#ff6b6b';
    } else if (type === 'warning') {
        notification.style.background = '#ffa500';
    }
    
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup Auto-save
function setupAutoSave() {
    const autoSaveToggle = document.getElementById('autoSaveToggle');
    
    if (autoSaveToggle.checked) {
        autoSaveInterval = setInterval(saveDocument, 30000);
    }
    
    autoSaveToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            autoSaveInterval = setInterval(saveDocument, 30000);
            showNotification('Auto-save enabled');
        } else {
            clearInterval(autoSaveInterval);
            showNotification('Auto-save disabled');
        }
    });
}

// Event Listeners
function attachEventListeners() {
    // Main buttons
    document.getElementById('saveBtn').addEventListener('click', () => {
        saveDocument();
        showNotification('Document saved!');
    });
    
    document.getElementById('exportPdfBtn').addEventListener('click', exportPDF);
    document.getElementById('exportTxtBtn').addEventListener('click', exportTXT);
    document.getElementById('exportDocxBtn').addEventListener('click', exportDOCX);
    
    document.getElementById('newBtn').addEventListener('click', openNewDocModal);
    
    document.getElementById('docsBtn').addEventListener('click', () => {
        displayDocuments();
        document.getElementById('docsModal').classList.add('active');
    });
    
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('active');
    });
    
    document.getElementById('sidebarBtn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Formatting buttons
    document.querySelectorAll('.formatting-toolbar button[data-format]').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.getAttribute('data-format');
            applyFormatting(format);
        });
    });

    document.getElementById('boldBtn').addEventListener('click', () => applyFormatting('bold'));
    document.getElementById('italicBtn').addEventListener('click', () => applyFormatting('italic'));
    document.getElementById('underlineBtn').addEventListener('click', () => applyFormatting('underline'));
    document.getElementById('strikeBtn').addEventListener('click', () => applyFormatting('strike'));
    document.getElementById('h1Btn').addEventListener('click', () => applyFormatting('h1'));
    document.getElementById('h2Btn').addEventListener('click', () => applyFormatting('h2'));
    document.getElementById('h3Btn').addEventListener('click', () => applyFormatting('h3'));
    document.getElementById('ulBtn').addEventListener('click', () => applyFormatting('ul'));
    document.getElementById('olBtn').addEventListener('click', () => applyFormatting('ol'));
    document.getElementById('quoteBtn').addEventListener('click', () => applyFormatting('quote'));
    document.getElementById('leftBtn').addEventListener('click', () => applyFormatting('left'));
    document.getElementById('centerBtn').addEventListener('click', () => applyFormatting('center'));
    document.getElementById('rightBtn').addEventListener('click', () => applyFormatting('right'));
    document.getElementById('clearBtn').addEventListener('click', clearFormatting);

    // Undo/Redo
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);

    // Editor events
    const editor = document.getElementById('editor');
    
    editor.addEventListener('input', () => {
        updateStats();
        saveToHistory();
        saveDocument();
    });
    
    editor.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
                e.preventDefault();
                applyFormatting('bold');
            } else if (e.key === 'i') {
                e.preventDefault();
                applyFormatting('italic');
            } else if (e.key === 'u') {
                e.preventDefault();
                applyFormatting('underline');
            } else if (e.key === 'z') {
                e.preventDefault();
                undo();
            } else if (e.key === 'y') {
                e.preventDefault();
                redo();
            } else if (e.key === 's') {
                e.preventDefault();
                saveDocument();
                showNotification('Document saved!');
            }
        }
    });

    document.getElementById('docTitle').addEventListener('input', saveDocument);

    // Search in docs
    document.getElementById('searchDocs').addEventListener('input', displayDocuments);

    // Close modals on outside click
    document.getElementById('docsModal').addEventListener('click', (e) => {
        if (e.target.id === 'docsModal') {
            closeDocsModal();
        }
    });

    document.getElementById('newDocModal').addEventListener('click', (e) => {
        if (e.target.id === 'newDocModal') {
            closeNewDocModal();
        }
    });

    document.getElementById('tableModal').addEventListener('click', (e) => {
        if (e.target.id === 'tableModal') {
            closeTableModal();
        }
    });

    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
            closeSettings();
        }
    });

    // Enter key in new doc modal
    document.getElementById('newDocName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createNewDoc();
    });

    // Enter key in table rows
    document.getElementById('tableRows').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('tableCols').focus();
    });

    // Enter key in table cols
    document.getElementById('tableCols').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') insertTable();
    });
}

// Initialize on load
window.addEventListener('load', init);

// Save on page close
window.addEventListener('beforeunload', saveDocument);