import { commands, ExtensionContext, window, workspace } from 'coc.nvim';
import { URI } from 'vscode-uri';

import { spawn } from 'child_process';

const resume = {
  target: '',
  replace: '',
};

export async function activate(context: ExtensionContext): Promise<void> {
  context.subscriptions.push(
    commands.registerCommand('coc-replacement.replace', async () => {
      setTimeout(async () => {
        const target: string = await window.requestInput('Target String', resume.target);
        if (!target) {
          return;
        }
        resume.target = target;

        let replace = '';
        replace = await window.requestInput('Replace String', resume.replace);
        if (replace === null) {
          replace = '';
          const flag = await window.showMenuPicker(['Cancel', 'Continue but empty'], 'What is next?');
          if ([0, -1].includes(flag)) {
            return;
          }
        }
        resume.replace = replace;

        try {
          const list: any[] = await workspace.nvim.call('getqflist');
          const fileNames = await Promise.all(
            list.map(async (item) => {
              const { bufnr } = item;
              const bufname = await workspace.nvim.call('bufname', bufnr);
              const fullpath = await workspace.nvim.call('fnamemodify', [bufname, ':p']);
              const uri = URI.file(fullpath).toString();
              return decodeURIComponent(new URL(uri).pathname);
            })
          );
          const all = fileNames.filter((file, index, self) => self.findIndex((T) => T === file) === index);
          const regReplaceProcess = spawn('regex-replace', ['-p', target, '-r', replace]);
          regReplaceProcess.stdin.write(all.join('\n'));
          regReplaceProcess.stdin.end();
          regReplaceProcess.stdout.pipe(process.stdout);
          await workspace.nvim.command(`e | echo "Done!"`);
        } catch (e: any) {
          window.showWarningMessage(e.message);
        }
      }, 50);
    })
  );
}
