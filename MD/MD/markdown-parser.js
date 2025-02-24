class MarkdownParser {
    constructor() {
        this.tokens = [];
    }

    parse(markdown) {
        this.tokens = []; // 重置 tokens 数组
        
        // 如果输入是纯文本（没有特殊格式），直接作为段落处理
        if (!markdown.includes('\n') && !this.hasMarkdownSyntax(markdown)) {
            this.tokens.push({
                type: 'paragraph',
                content: markdown
            });
            return this.tokens;
        }

        // 将输入按行分割
        const lines = markdown.split('\n');
        
        let inTable = false;
        let tableData = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 处理水平线
            if (line.match(/^(-{3,}|\*{3,})$/)) {
                this.tokens.push({ type: 'hr' });
                continue;
            }
            
            // 处理表格
            if (line.startsWith('|') && line.endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableData = [];
                }
                tableData.push(line);
                
                // 如果这是表格的最后一行或下一行不是表格
                if (!lines[i + 1] || !lines[i + 1].trim().startsWith('|')) {
                    this.parseTable(tableData);
                    inTable = false;
                    tableData = [];
                }
                continue;
            }
            
            // 处理其他 Markdown 语法
            if (line === '') {
                continue; // 跳过空行
            } else if (line.startsWith('#')) {
                this.parseHeading(line);
            } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
                this.parseListItem(line);
            } else if (line.startsWith('> ')) {
                this.parseBlockquote(line);
            } else if (!inTable) {
                this.parseParagraph(line);
            }
        }
        return this.tokens;
    }

    // 检查文本是否包含 Markdown 语法
    hasMarkdownSyntax(text) {
        const markdownSyntax = [
            /^#{1,6}\s/,      // 标题
            /^\s*[-+*]\s/,    // 列表
            /^\s*>\s/,        // 引用
            /\*\*.*\*\*/,     // 粗体
            /\*.*\*/,         // 斜体
            /`.*`/,           // 行内代码
            /\[.*\]\(.*\)/,   // 链接
            /^-{3,}$/,        // 水平线
            /^[|].*[|]$/,     // 表格
            /~~.*~~/          // 删除线
        ];
        return markdownSyntax.some(regex => regex.test(text));
    }

    parseHeading(line) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            this.tokens.push({
                type: 'heading',
                level: match[1].length,
                content: this.parseInline(match[2])
            });
        }
    }

    parseListItem(line) {
        const content = line.substring(2);
        this.tokens.push({
            type: 'list_item',
            content: this.parseInline(content)
        });
    }

    parseBlockquote(line) {
        const content = line.substring(2);
        this.tokens.push({
            type: 'blockquote',
            content: this.parseInline(content)
        });
    }

    parseParagraph(line) {
        this.tokens.push({
            type: 'paragraph',
            content: this.parseInline(line)
        });
    }

    parseTable(tableLines) {
        // 验证表格格式
        if (tableLines.length < 3) return; // 至少需要表头、分隔行和一行数据
        
        // 解析表头
        const headers = tableLines[0]
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell !== '');

        // 验证分隔行格式
        const separatorLine = tableLines[1];
        const separatorCells = separatorLine
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell !== '');

        if (!separatorCells.every(cell => /^:?-+:?$/.test(cell))) return;

        // 解析对齐方式
        const alignments = separatorCells.map(cell => {
            if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
            if (cell.endsWith(':')) return 'right';
            if (cell.startsWith(':')) return 'left';
            return 'left';
        });

        // 解析数据行
        const rows = tableLines.slice(2).map(line => {
            const cells = line
                .split('|')
                .map(cell => cell.trim())
                .filter(cell => cell !== '');
            return cells;
        });

        // 确保所有行的列数一致
        const columnCount = headers.length;
        const normalizedRows = rows.map(row => {
            if (row.length < columnCount) {
                return [...row, ...Array(columnCount - row.length).fill('')];
            }
            return row.slice(0, columnCount);
        });

        this.tokens.push({
            type: 'table',
            headers,
            alignments,
            rows: normalizedRows
        });
    }

    parseInline(text) {
        // 处理删除线
        text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
        
        // 处理其他行内元素
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        text = text.replace(/`(.+?)`/g, '<code>$1</code>');
        text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
        
        return text;
    }

    render(tokens) {
        let html = '';
        let inList = false;

        for (const token of tokens) {
            switch (token.type) {
                case 'hr':
                    html += '<hr>\n';
                    break;
                    
                case 'table':
                    html += '<table>\n';
                    // 渲染表头
                    html += '<thead>\n<tr>\n';
                    token.headers.forEach((header, index) => {
                        const align = token.alignments[index];
                        html += `<th style="text-align:${align}">${this.parseInline(header)}</th>\n`;
                    });
                    html += '</tr>\n</thead>\n';
                    
                    // 渲染数据行
                    html += '<tbody>\n';
                    token.rows.forEach(row => {
                        html += '<tr>\n';
                        row.forEach((cell, index) => {
                            const align = token.alignments[index];
                            html += `<td style="text-align:${align}">${this.parseInline(cell)}</td>\n`;
                        });
                        html += '</tr>\n';
                    });
                    html += '</tbody>\n</table>\n';
                    break;
                    
                case 'heading':
                    html += `<h${token.level}>${token.content}</h${token.level}>\n`;
                    break;
                    
                case 'paragraph':
                    html += `<p>${token.content}</p>\n`;
                    break;
                    
                case 'list_item':
                    if (!inList) {
                        html += '<ul>\n';
                        inList = true;
                    }
                    html += `<li>${token.content}</li>\n`;
                    break;
                    
                case 'blockquote':
                    html += `<blockquote>${token.content}</blockquote>\n`;
                    break;
                    
                case 'code_block':
                    html += `<pre><code>${token.content}</code></pre>\n`;
                    break;
                    
                case 'blank_line':
                    if (inList) {
                        html += '</ul>\n';
                        inList = false;
                    }
                    break;
            }
        }

        if (inList) {
            html += '</ul>\n';
        }

        return html;
    }
}

// 导出解析器
window.MarkdownParser = MarkdownParser; 