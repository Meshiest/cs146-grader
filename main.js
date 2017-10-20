const req = require('request');
const Canvas = require('node-canvas-lms');
const readYaml = require('read-yaml');
const leftPad = require('left-pad');
const _ = require('lodash');

let prompt = require('prompt');
prompt.message = 'Select';
prompt.delimeter = ':';

let canvas;
const PADDING = 5;

// Gets a page from canvas
function get(route, params) {
  return new Promise((resolve, reject) =>
    canvas.get(route, _.merge({per_page: 100}, params || {}), (err, resp, body) =>
      err ? reject(err) : resolve(body)));
}

// Prompts the user with the given options
function choose(options) {
  return new Promise((resolve, reject) => 
    prompt.get(options, (err, result) => err ? reject(err) : resolve(result)));
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

readYaml('config.yml', (err, data) => {
  if (err) {
    console.error('Missing config.yml file');
    return;
  }

  if(typeof data.host !== 'string') {
    console.error('Missing config.yml host');
    return;
  }

  if(typeof data.token !== 'string') {
    console.error('Missing config.yml token');
    return;
  }

  canvas = new Canvas(data.host, data);

  try {
    main();
  } catch (e) {
    console.error(e);
  }
});

async function main() {
  console.log('Fetching Courses...');
  let courses;

  try {
    courses = await get('courses');
  } catch (err) {
    if(err.statusCode == 401) {
      console.error('Unauthorized config.yml token');
      return;
    } else
      throw err;
  }

  if(!courses.length) {
    console.error('No Courses...');
    return;
  }

  console.log('Select a Course: (* means Ta)');
  _.each(courses, (course, i) => {
    let grading = _.find(course.enrollments, {type: 'ta'}) ? ' *' : '  ';
    console.log(`${grading}${leftPad(i + 1, PADDING)}) ${course.name} - ${course.course_code}`);
  });


  let choice, result;
  do {
    if(choice)
      console.error('Invalid course selection');
    prompt.start();
    result = await choose([{
      name: 'choice',
      validator: /^\d+$/,
      required: true,
      warning: 'Selection must be numeric',
    }]);
    choice = parseInt(result.choice) - 1;
  } while(choice > courses.length);

  let course = courses[choice].id;

  console.log('Fetching Students...');
  let studentsPromise = get(`courses/${course}/students`);

  console.log('Fetching Assignments...');
  let assignments = await get(`courses/${course}/assignments`);

  if(!assignments.length) {
    console.error('No Assignments...');
    return;
  }

  console.log('Select an Assignment: ');
  _.each(assignments, (assignment, i) =>
    console.log(`${leftPad(i + 1, PADDING)}) ${assignment.name}`));

  choice = 0;
  do {
    if(choice)
      console.error('Invalid assignment selection');
    prompt.start();
    result = await choose([{
      name: 'choice',
      validator: /^\d+$/,
      required: true,
      warning: 'Selection must be numeric',
    }]);
    choice = parseInt(result.choice) - 1;
  } while(choice > courses.length);

  let assignment = assignments[choice].id;

  console.log('Fetching Submissions...');
  let submissions = await get(`courses/${course}/assignments/${assignment}/submissions`)
  let students = await studentsPromise;

  let longestName = _.max(students.map(s=>s.name.length));
  _.each(submissions, (submission, i) => {
    let student = _.find(students, {id: submission.user_id});
    console.log(leftPad(i + 1, PADDING) + ') ' +
      (submission.workflow_state === 'submitted' ? '[x]' : '[ ]') + ' ' +
      _.padEnd(student.name, longestName) + ' - ' +
      (submission.attachments ?
        submission.attachments.map(f => f.display_name).join(', ') : ''));
  });
}