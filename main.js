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

readYaml('config.yml', async (err, data) => {
  if (err) {
    console.err('Missing config.yml file');
    return;
  }

  if(typeof data.host !== 'string') {
    console.err('Missing config.yml host');
    return;
  }

  if(typeof data.token !== 'string') {
    console.err('Missing config.yml token');
    return;
  }

  canvas = new Canvas(data.host, data);
  console.log('Fetching Courses...');
  let courses;

  try {
    courses = await get('courses');
  } catch (err) {
    if(err.statusCode == 401) {
      console.err('Unauthorized config.yml token');
      return;
    } else
      throw err;
  }

  console.log('Select a Course: (* means Ta)');
  _.each(courses, (course, i) => {
    let grading = _.find(course.enrollments, {type: 'ta'}) ? ' *' : '  ';
    console.log(`${grading}${leftPad(i + 1, PADDING)}) ${course.name} - ${course.course_code}`);
  });


  let choice, result;
  do {
    if(choice)
      console.err('Invalid course selection');
    prompt.start();
    result = choose([{
      name: 'choice',
      validator: /^\d+$/,
      required: true,
      warning: 'Selection must be numeric',
    }]);
    choice = parseInt(result.choice) - 1;
  } while(choice > courses.length);

  let course = courses[choice].id;

  console.log('Fetching Students...', course);
  let studentPromise = get(`courses/${course}/students`);

  let students = await studentPromise;
  console.log('Students: ', students);

  console.log('Fetching Assignments...');
  let assignments = await get(`courses/${course}/assignments`)

  console.log('Select an Assignment: ');
  _.each(assignments, (assignment, i) =>
    console.log(`${leftPad(i + 1, PADDING)}) ${assignment.name}`));



  choice = 0;
  do {
    if(choice)
      console.err('Invalid assignment selection');
    prompt.start();
    result = choose([{
      name: 'choice',
      validator: /^\d+$/,
      required: true,
      warning: 'Selection must be numeric',
    }]);
    choice = parseInt(result.choice) - 1;
  } while(choice > courses.length);

  let assignment = assignments[result.choice].id;

  console.log('Fetching Submissions...');
  let submissions = await get(`courses/${course}/assignments/${assignment}/submissions`)
  
  console.log(assignments);
  _.each(assignments, (submission, i) => {
    console.log(leftPad(i + 1, numPadding) + ') ' +
      (submission.workflow_state === 'submitted' ? '[x]' : '[ ]') + ' ' +
      (typeof submission.attachments !== 'undefined' ?
        submission.attachments.map(f => f.display_name).join(', ') :
        '-'));
  });

});