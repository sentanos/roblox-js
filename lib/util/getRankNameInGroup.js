// Includes
var http = require('./http.js').func
var cache = require('../cache')

// Args
exports.required = ['group', 'userId']

// Define
function getRankInGroup (group, userId) {
  return function (resolve, reject) {
    http({url: '//www.roblox.com/Game/LuaWebService/HandleSocialRequest.ashx?method=GetGroupRole&playerid=' + userId + '&groupId=' + group})
    .then(function (body) {
      // Efficient
      resolve(body);
    });
  };
}

exports.func = function (args) {
  var id = args.userId;
  return cache.wrap('Rank', id, getRankNameInGroup(args.group, id));
};
