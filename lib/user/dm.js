// Includes
var http = require('../util/http.js').func;
var queue = require('../internal/queue.js');
var getGeneralToken = require('../util/getGeneralToken.js').func;
var getHash = require('../util/getHash.js').func;

// Args
exports.required = ['conversationId', 'message'];

// Define
function message (jar, token, conversationId, message) {
  var httpOpt = {
    url: '//chat.roblox.com/v2/send-message',
    options: {
      method: 'POST',
      jar: jar,
      headers: {
        'X-CSRF-TOKEN': token
      },
      json: {
        conversationId: conversationId,
        message: message
      },
      resolveWithFullResponse: true
    }
  };
  return http(httpOpt)
  .then(function (res) {
    if (res.statusCode === 200) {
      var body = res.body;
      if (!body.success) {
        throw new Error(body.shortMessage);
      }
    } else {
      throw new Error('Message failed');
    }
  });
}

exports.func = function (args) {
  var jar = args.jar;
  return queue('Message', getHash({jar: jar}), function () {
    return getGeneralToken({jar: jar})
    .then(function (xcsrf) {
      return message(jar, xcsrf, args.recipient, args.subject, args.body);
    });
  }, function () {
    return true;
  });
};
