const req = require('request');
const Canvas = require('node-canvas-lms');
const readYaml = require('read-yaml');
const leftPad = require('left-pad');
const _ = require('lodash');
let prompt = require('prompt');

let course;

readYaml('config.yml', function(err, data) {
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
        canvas.get(`courses/${body[choice].id}/assignment`, {}, (err, resp, body) => {
          if(err) throw err;

          console.log(resp, body);
        });
      }
    });

  })
});
