// Dependencies
var parser = require('cheerio');

// Includes
var http = require('../util/http.js').func;
var getDate = require('../util/getDate.js').func;
var getVerification = require('../util/getVerification.js').func;
var getVerificationInputs = require('../util/getVerificationInputs.js').func;
var threaded = require('../util/threaded.js').func;

// Args
exports.required = ['group'];
exports.optional = ['page', 'stream', 'view', 'jar'];

// Define
function getPosts (wall, body, page, view, formalInputs) {
  var $ = parser.load(body);
  var available = $('#ctl00_cphRoblox_GroupWallPane_GroupWall_ctrl0_NoWallPostsPanel').length === 0;
  if (!available) {
    if (wall) {
      wall.totalPages = 0;
      return;
    } else {
      return 0;
    }
  }
  var totalPages = parseInt($('#ctl00_cphRoblox_GroupWallPane_GroupWallPager_ctl01_Div1').find('.paging_pagenums_container').text(), 10);
  var thisPage = {
    posts: [],
    page: page
  };
  if (wall) {
    var posts = $('.GroupWall_PostContainer');
    for (var i = 0; i < posts.length; i++) {
      var container = posts.eq(i);
      var post = container.parent().parent();
      var user = post.find('.UserLink').find('a');
      var element = {
        content: container.text(),
        author: {
          id: parseInt(user.attr('href').match(/\d+/)[0], 10),
          name: user.text().trim()
        },
        date: getDate({time: post.find('.GroupWall_PostDate').find('span').eq(0).text(), timezone: 'CT'}),
        parent: {
          page: page,
          index: i
        },
        id: parseInt(post.find('.AbuseButton').find('a').attr('href').match(/groupwallpost\?id=(\d+)/)[1], 10) // In fact wall posts do have IDs (as all reportable items have to have) but other than for reporting it isn't really exposed to be used
      };
      if (wall.stream) {
        thisPage.posts.push(element);
      } else {
        wall.posts.push(element);
      }
    }
    wall.totalPages = totalPages;
    if (view) {
      var viewInfo;
      if (formalInputs) {
        viewInfo = getVerificationInputs({selector: $});
      } else {
        viewInfo = {
          __VIEWSTATE: body.match(/__VIEWSTATE\|(.*?)\|/)[1],
          __EVENTVALIDATION: body.match(/__EVENTVALIDATION\|(.*?)\|/)[1]
        };
      }
      if (wall.stream) {
        thisPage.view = viewInfo;
      } else {
        if (!wall.views) {
          wall.views = [];
        }
        wall.views[page] = viewInfo;
      }
    }
    if (wall.stream) {
      wall.stream.write(thisPage);
    }
  }
  $ = null;
  body = null;
  if (!wall) {
    return totalPages;
  }
}

exports.func = function (args) {
  var page = args.page;
  var jar = args.jar;
  var group = args.group;
  var view = args.view;
  var getStatus = function () {
    return 0;
  };
  var isArray = page instanceof Array;
  var wall = {
    posts: [],
    stream: args.stream || false
  };
  if (page && !isArray) {
    page = [page];
  }

  function getPages (inputs, pages, totalPages) {
    var start, end;
    var isArray = pages instanceof Array;
    if (isArray) {
      start = 0;
      end = pages.length;
    } else {
      start = 2;
      end = pages + 1;
    }

    function getPage (i) {
      var page = isArray ? pages[i] : i;
      if (page <= totalPages && page > 0) {
        var httpOpt = {
          url: '//www.roblox.com/My/Groups.aspx?gid=' + group,
          options: {
            method: 'POST',
            form: inputs,
            headers: {
              'User-Agent': 'Mozilla'
            },
            jar: jar
          }
        };
        var form = httpOpt.options.form;
        form.__ASYNCPOST = 'true';
        form.ctl00$ScriptManager = 'ctl00$cphRoblox$GroupWallPane$GroupWallUpdatePanel|ctl00$cphRoblox$GroupWallPane$GroupWallPager$ctl01$HiddenInputButton';
        form.ctl00$cphRoblox$GroupWallPane$GroupWallPager$ctl01$PageTextBox = page;
        form.ctl00$cphRoblox$GroupWallPane$GroupWallPager$ctl01$HiddenInputButton = '';
        return http(httpOpt)
        .then(function (body) {
          getPosts(wall, body, page, view);
        });
      }
    }

    var operation = threaded({getPage: getPage, start: start, end: end});
    getStatus = operation.getStatus;
    return operation.then(function () {
      if (wall.stream) {
        wall.stream.end();
      } else {
        wall.posts = wall.posts.sort(function (a, b) {
          return b.id - a.id;
        });
      }
      return wall;
    });
  }

  var promise = getVerification({
    url: '//www.roblox.com/My/Groups.aspx?gid=' + group,
    jar: jar,
    getBody: true,
    ignoreCache: true
  })
  .then(function (response) {
    var inputs = response.inputs;
    var first = page ? page.indexOf(1) : 0;
    var totalPages = getPosts(first !== -1 ? wall : null, response.body, 1, view, true) || wall.totalPages;
    if (Number.isNaN(totalPages)) {
      throw new Error('You do not have permission to view the wall');
    } else if (totalPages === 0) {
      wall.totalPages = 0;
      return wall;
    }
    if (page && first !== -1) {
      page.splice(first, 1);
    }
    return getPages(inputs, page || totalPages, totalPages);
  });
  promise.getStatus = function () {
    return getStatus();
  };
  return promise;
};
