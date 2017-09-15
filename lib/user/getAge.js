// Includes
var http = require('../util/http.js').func;
var parser = require('cheerio');

// Args
exports.required = ['userId'];
exports.optional = ['days'];
// Define
exports.func = function (args) {
  return http({
    url: '//www.roblox.com/users/' + args.userId + '/profile',
    options: {
      resolveWithFullResponse: true,
      followRedirect: false
    }
  })
  .then(function (res) {
    if (res.statusCode === 200) {
      var playerDate = parser.load(res.body)('.profile-stats-container .text-lead').text().slice(0,9);
      if (args.days) {
        playerDate = Date.parse(playerDate);
        var currentTime = new Date();
        return Math.round(Math.abs((playerDate - currentTime.getTime())/(24*60*60*1000)))

      } else {
          return playerDate; 
      }

    } else {
      throw new Error('User does not exist');
    }
  });
};
