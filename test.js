// test-ffmpeg.js
import { exec } from 'child_process';

// IMPORTANT: Double-check that this path is 100% correct.
const ffmpegPath = 'C:/ffmpeg/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe';

// We enclose the path in quotes to handle any potential spaces.
const command = `"${ffmpegPath}" -version`;

console.log(`Attempting to execute command: ${command}`);
console.log('-------------------------------------------');

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`🔴 EXECUTION FAILED!`);
    console.error(`   Error Message: ${error.message}`);
    console.error('   This usually means the path is wrong or you have a permissions issue.');
    console.error('---');
    return;
  }

  if (stderr && !stdout) {
    console.error(`🟡 FFMPEG RETURNED AN ERROR:`);
    console.error(stderr);
    console.error('---');
    return;
  }

  console.log(`🟢 FFMPEG EXECUTED SUCCESSFULLY!`);
  console.log(`   FFmpeg Version Info:`);
  console.log(stdout);
  console.log('---');
});