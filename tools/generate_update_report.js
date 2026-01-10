const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 生成更新报告
 * 从package.json获取版本号，然后获取该版本时间以后的git提交日志，生成更新报告
 */
function generateUpdateReport() {
    // 读取package.json文件（从根目录读取）
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version;
    
    // 提取版本号中的时间部分 (格式：2.1.0.20251026 -> 20251026)
    const timePart = version.split('.')[3];
    if (!timePart || timePart.length !== 8) {
        console.error('版本号格式不正确，无法提取时间部分');
        return;
    }
    
    // 转换时间格式为YYYY-MM-DD，并加一天以排除当天提交
    const year = parseInt(timePart.substring(0, 4));
    const month = parseInt(timePart.substring(4, 6)) - 1; // JavaScript月份从0开始
    const day = parseInt(timePart.substring(6, 8));
    const dateObj = new Date(year, month, day);
    dateObj.setDate(dateObj.getDate() + 1); // 加一天
    
    // 格式化日期为YYYY-MM-DD
    const formattedYear = dateObj.getFullYear();
    const formattedMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
    const formattedDay = String(dateObj.getDate()).padStart(2, '0');
    const date = `${formattedYear}-${formattedMonth}-${formattedDay}`;
    
    // 获取git提交日志（在项目根目录运行）
    const gitLogCommand = `git log --since="${date}" --pretty=format:"%s"`;
    let gitLogs;
    try {
        gitLogs = execSync(gitLogCommand, { encoding: 'utf8', cwd: path.resolve(__dirname, '..') });
    } catch (error) {
        console.error('获取git日志失败:', error.message);
        return;
    }
    
    // 处理git日志，提取唯一的更新项
    const logLines = gitLogs.split('\n').filter(line => line.trim() !== '');
    const uniqueUpdates = new Set();
    
    // 过滤掉不需要的提交信息
    const filteredLines = logLines.filter(line => {
        const lowerLine = line.toLowerCase();
        return !lowerLine.includes('merge branch') &&
               !lowerLine.includes('update package.json') &&
               !lowerLine.includes('修改版本号') &&
               !lowerLine.includes('.gitignore') &&
               !lowerLine.includes('revert') &&
               !lowerLine.includes('merge') &&
               line.trim() !== '.';
    });
    
    filteredLines.forEach(line => {
        // 移除换行符，将多行合并为一行
        let cleanLine = line.replace(/\r?\n/g, ' ');
        // 去除多余空格
        cleanLine = cleanLine.replace(/\s+/g, ' ').trim();
        
        // 分割多行提交信息 (处理中文分号和英文分号)
        let updates = cleanLine.split(/[；;]/).filter(update => update.trim() !== '');
        
        // 处理可能包含多个更新项的长行
        if (updates.length === 1) {
            // 使用正则表达式分割以数字+点开头的更新项
            updates = cleanLine.split(/(?<!\d)(?=\d+\.)/);
        }
        
        updates.forEach(update => {
            // 去除序号和多余空格
            let cleanUpdate = update.replace(/^\d+\.\s*/, '').trim();
            // 去除多余空格
            cleanUpdate = cleanUpdate.replace(/\s+/g, ' ').trim();
            // 过滤掉空行、只有标点的行以及无效内容
            if (cleanUpdate && 
                !/^[.。，,；;]+$/.test(cleanUpdate) &&
                !/^\d+$/.test(cleanUpdate) &&
                !cleanUpdate.includes('1. ') && !cleanUpdate.includes('2. ') &&
                !cleanUpdate.includes('3. ') && !cleanUpdate.includes('4. ') &&
                !cleanUpdate.includes('5. ') && !cleanUpdate.includes('6. ') &&
                !cleanUpdate.includes('7. ') && !cleanUpdate.includes('8. ') &&
                !cleanUpdate.includes('9. ') &&
                cleanUpdate.length > 5) {
                uniqueUpdates.add(cleanUpdate);
            }
        });
    });
    
    // 生成报告，将版本号时间部分改为今天的日期
    const today = new Date();
    const todayDateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    // 修改版本号时间部分
    const versionParts = version.split('.');
    versionParts[3] = todayDateStr;
    const newVersion = versionParts.join('.');
    
    let report = `### ${newVersion}\n`;
    Array.from(uniqueUpdates).forEach((update, index) => {
        report += `${index + 1}. ${update}\n`;
    });
    
    // 输出报告
    console.log('更新报告生成成功:');
    console.log(report);
    
    // 保存报告到文件
    fs.writeFileSync('./UPDATE_REPORT.md', report, 'utf8');
    console.log('报告已保存到 UPDATE_REPORT.md');
}

// 执行生成报告
 generateUpdateReport();