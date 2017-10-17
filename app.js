const chalk = require('chalk');
const prompt = require('prompt');

const canvas = require('./api/canvas');

const runGrader = async () => {
	if (!process.env.TOKEN) throw Error(`You must specify TOKEN in .env file`);

	prompt.start();
	console.log(chalk.cyan('Using Token:\n'), chalk.red(process.env.TOKEN));

	const courses = await canvas.getGradeable();
	console.log(chalk.cyan('Gradeable Course:\n'), courses);

	const assignments = await canvas.getAssignments('20648');
	console.log(chalk.cyan('Assignments for course (20648):\n'), assignments);

	const files = await canvas.getSubs('20648', '92367');
	console.log(
		chalk.cyan('Submissions for assignment (92367) in course (20648):\n'),
		files
	);
};

runGrader().catch(err => console.error(err));
