const req = require('request');
const Canvas = require('node-canvas-lms');
const readYaml = require('read-yaml');
const leftPad = require('left-pad');
const _ = require('lodash');
let prompt = require('prompt');

let course;

readYaml('config.yml', (err, data) => {
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
  canvas.get('courses', {}, (err, resp, body) => {
    if (err) {
      if(err.statusCode == 401)
        console.err('Unauthorized config.yml token');
      else
        throw err;

      return;
    }

    //console.log(body.map(c => c.enrollments));
    let numPadding = (body.length + 1 +'').length + 1;
    console.log('Select a Course: (* means Ta)');
    _.each(body, (course, i) => {
      let grading = _.find(course.enrollments, {type: 'ta'}) ? ' *' : '  ';
      console.log(`${grading}${leftPad(i + 1, numPadding)}) ${course.name} - ${course.course_code}`);
    });

    prompt.start();
    prompt.message = 'Select';
    prompt.delimeter = ':';

    prompt.get([{
      name: 'choice',
      validator: /^\d+$/,
      required: true,
      warning: 'Selection must be numeric',
    }], (err, result) => {
      if (err) throw err;
      let choice = parseInt(result.choice) - 1;
      if(choice > body.length)
        console.err('Invalid course selection');
      else {
        let course = body[choice].id;

        console.log('Fetching Assignments...');
        canvas.get(`courses/${course}/assignments`, {}, (err, resp, body) => {
          numPadding = (body.length + 1 +'').length + 3;
          console.log('Select an Assignment: ');
          _.each(body, (assignment, i) =>
            console.log(`${leftPad(i + 1, numPadding)}) ${assignment.name}`));

          if(err) throw err;
          prompt.start();
          // console.log(resp, body);
          prompt.get([{
            name: 'choice',
            validator: /^\d+$/,
            required: true,
            warning: 'Selection must be numeric',
          }], (err, result) => {

            if (err) throw err;
            let choice = parseInt(result.choice) - 1;
            if(choice > body.length)
              console.err('Invalid assignment selection');
            else {
              let assignment = body[choice].id;
              
              console.log('Fetching Submissions...');
              canvas.get(`courses/${course}/assignments/${assignment}/submissions`, {per_page: 100}, (err, resp, body) => {
                numPadding = (body.length + 1 +'').length + 3;
                //console.log(body);
                _.each(body, (submission, i) => {
                  console.log(leftPad(i + 1, numPadding) + ') ' +
                    (submission.workflow_state === 'submitted' ? '[x]' : '[ ]') + ' ' +
                    (typeof submission.attachments !== 'undefined' ?
                      submission.attachments.map(f => f.display_name).join(', ') :
                      '-'));
                });
              });

            }

          });
        });
      }
    });
  })
});