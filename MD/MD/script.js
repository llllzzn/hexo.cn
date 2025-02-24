// 初始化 Markdown 解析器
const parser = new MarkdownParser();

// 获取编辑器和预览区域的元素
const editor = document.getElementById('markdown-editor');
const previewElement = document.getElementById('markdown-preview');

// 防抖函数（仅用于自动保存）
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// 更新预览内容的函数
function updatePreview() {
    // 获取输入的 Markdown 文本
    const markdownText = editor.value;
    
    // 重置预览元素内容
    previewElement.textContent = '';
    
    // 解析 Markdown 为 tokens，然后渲染为 HTML
    const tokens = parser.parse(markdownText);
    const html = parser.render(tokens);
    
    // 直接更新预览内容，不使用 requestAnimationFrame
    previewElement.innerHTML = html;
}

// 使用防抖处理输入事件
const debouncedUpdate = debounce(updatePreview, 100);

// 只监听必要的事件
editor.addEventListener('input', debouncedUpdate);

// 页面加载完成时进行初始预览
document.addEventListener('DOMContentLoaded', () => {
    // 恢复保存的主题
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // 恢复保存的内容（如果有）
    const savedContent = localStorage.getItem('markdown-content');
    if (savedContent) {
        editor.value = savedContent;
    }
    
    // 初始预览
    updatePreview();
});

// 自动保存内容
editor.addEventListener('input', debounce(() => {
    localStorage.setItem('markdown-content', editor.value);
}, 1000));

// 主题切换功能
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// 导出为 PDF 功能
function exportToPDF() {
    const element = document.getElementById('markdown-preview');
    html2pdf().from(element).save('markdown.pdf');
}

// 导出为 HTML 功能
function exportToHTML() {
    const element = document.getElementById('markdown-preview');
    const markdownContent = editor.value; // 保存原始的Markdown内容
    
    // 创建完整的HTML文档
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown文档</title>
    <style>
        img { max-width: 100%; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <!-- 原始Markdown内容 -->
    <textarea id="markdown-editor" style="display:none;">${markdownContent}</textarea>
    <!-- 渲染后的HTML内容 -->
    <div id="markdown-preview">
        ${element.innerHTML}
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markdown.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 新建文档功能
function newDocument() {
    if (editor.value.trim() !== '') {
        if (!confirm('确定要新建文档吗？当前文档的内容将会丢失。')) {
            return;
        }
    }
    
    // 清空编辑器内容
    editor.value = '';
    
    // 清空本地存储的内容
    localStorage.removeItem('markdown-content');
    
    // 更新预览
    updatePreview();
    
    // 让编辑器获得焦点
    editor.focus();
}

// 打开文档功能
function openDocument() {
    if (editor.value.trim() !== '') {
        if (!confirm('确定要打开新文档吗？当前文档的内容将会丢失。')) {
            return;
        }
    }
    
    const fileInput = document.getElementById('fileInput');
    fileInput.accept = '.md,.txt,.html';
    fileInput.click();
}

// 监听文件选择
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            
            // 如果是HTML文件，尝试提取原始的Markdown内容
            if (file.name.endsWith('.html')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                
                // 尝试从编辑器内容中提取原始Markdown
                const editorContent = tempDiv.querySelector('#markdown-editor');
                if (editorContent && editorContent.value) {
                    // 处理可能的HTML实体编码
                    const decodedContent = editorContent.value
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&amp;/g, '&')
                        .replace(/&#39;/g, "'");
                    editor.value = decodedContent;
                } else {
                    // 如果找不到原始Markdown，则提取预览区域的内容
                    const previewContent = tempDiv.querySelector('#markdown-preview');
                    if (previewContent) {
                        // 处理链接
                        const links = previewContent.querySelectorAll('a');
                        links.forEach(link => {
                            const text = link.textContent;
                            const href = link.getAttribute('href');
                            link.textContent = `[${text}](${href})`;
                        });
                        
                        // 处理图片
                        const images = previewContent.querySelectorAll('img');
                        images.forEach(img => {
                            const alt = img.getAttribute('alt') || 'image';
                            const src = img.getAttribute('src');
                            img.outerHTML = `![${alt}](${src})`;
                        });
                        
                        editor.value = previewContent.textContent;
                    } else {
                        editor.value = content;
                    }
                }
            } else {
                // 如果是.md或.txt文件，直接设置内容
                editor.value = content;
            }
            
            updatePreview();
            localStorage.setItem('markdown-content', editor.value);
        } catch (error) {
            alert('文件内容读取失败！');
            console.error('File reading error:', error);
        }
    };
    
    reader.onerror = function(e) {
        alert('文件读取失败！');
        console.error('FileReader error:', e);
    };
    
    reader.readAsText(file, 'UTF-8');
    this.value = '';
});