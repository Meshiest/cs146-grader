const axios = require('axios');
const _ = require('lodash');
require('dotenv').config();

const fetchCanvas = async endpoint => {
	const req = await axios.get(
		`https://sit.instructure.com/api/v1/${endpoint}?access_token=${process.env
			.TOKEN}`
	);
	return req.data;
};

module.exports = {
	getGradeable: async () => {
		const gradeable = await fetchCanvas('courses/');
		// Courses may have more than one object under enrollment
		return gradeable
			.filter(c => _.find(c.enrollments, { type: 'ta' }))
			.map(c => {
				return {
					id: c.id,
					name: c.name
				};
			});
	},
	getAssignments: async courseID => {
		const assignments = await fetchCanvas(`courses/${courseID}/assignments`);
		return assignments.map(ass => {
			return {
				id: ass.id,
				name: ass.name
			};
		});
	},
	getSubs: async (courseID, assignID) => {
		const subs = await fetchCanvas(
			`courses/${courseID}/assignments/${assignID}/submissions`
		);
		return subs; // TODO: finish this
	}
};
