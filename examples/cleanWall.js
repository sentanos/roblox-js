// Delete posts from a group wall, including by post content and by author name.
var rbx = require('roblox-js');
var ProgressBar = require('progress');
var prompt = require('prompt');

prompt.message = '';
var schema = {
  properties: {
    group: {
      description: 'Enter group ID',
      required: true,
      type: 'integer',
      message: 'Group ID must be an integer'
    },
    username: {
      description: 'Enter ROBLOX account username',
      required: true
    },
    password: {
      description: 'Enter ROBLOX account password',
      hidden: true,
      replace: '*',
      required: true
    },
    find: {
      description: 'Enter a string to find, this will only delete messages that have the specific string in them (optional)'
    },
    author: {
      description: 'Enter author username to find. This will only delete messages made by this player (optional)'
    },
    startPage: {
      description: 'Enter starting page (leave blank for all pages)',
      type: 'integer',
      message: 'Page must be an integer'
    },
    endPage: {
      description: 'Enter ending page',
      type: 'integer',
      message: 'Page must be an integer',
      ask: function () {
        return prompt.history('startPage').value > 0;
      }
    }
  }
};

function clear (group, wall) {
  var deletion = new ProgressBar('Deleting posts [:bar] :current/:total = :percent :etas remaining ', {total: 10000});
  console.time('Time: ');
  var posts = wall.posts;
  var thread = rbx.threaded(function (i) {
    var post = posts[i];
    return rbx.deleteWallPost({
      group: group,
      post: {
        parent: {
          index: post.parent.index
        },
        view: wall.views[post.parent.page]
      }
    });
  }, 0, posts.length);
  var ivl = setInterval(function () {
    deletion.update(thread.getStatus() / 100);
  }, 1000);
  thread.then(function () {
    clearInterval(ivl);
    console.timeEnd('Time: ');
  });
}

function init (group, username, password, find, author, startPage, endPage) {
  rbx.login(username, password)
  .then(function () {
    var pages;
    if (startPage && endPage) {
      pages = [];
      for (var i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    var wall = new ProgressBar('Getting wall [:bar] :current/:total = :percent :etas remaining ', {total: 10000, clear: true});
    var promise = rbx.getWall({
      group: group,
      page: pages,
      view: true
    });
    promise.then(function (wall) {
      var posts = wall.posts;
      // Remember these are reversed, it starts off with all the posts on the wall and you are REMOVING the ones you DON'T want to delete from the array
      for (var i = posts.length - 1; i >= 0; i--) {
        var post = posts[i];
        if (author && post.author.name !== author) { // Delete all posts by Bob
          posts.splice(i, 1);
        } else if (find && post.content.includes(find)) { // Delete all posts that contain "Bob"
          posts.splice(i, 1);
        }
      }
      if (posts.length === 0) {
        console.log('There are no messages to delete!');
        return;
      }
      console.log('You are about to delete ' + posts.length + ' messages selected from ' + (startPage && endPage ? ('page ' + startPage + ' to ' + endPage) : ('ALL pages')));
      console.log('The list starts from the message starting with "' + posts[0].content.substring(0, 20) + '..." and ends with the message starting with "' + posts[posts.length - 1].content.substring(0, 20) + '..."');
      prompt.get({
        name: 'yesno',
        message: 'Are you sure you want to do this? y/n',
        validator: /^y|n$/,
        required: true,
        warning: 'You must respond with "y" or "n"'
      }, function (err, result) {
        if (err) {
          console.error('Prompt error: ' + err.message);
          return;
        }
        if (result.yesno === 'y') {
          clear(group, wall);
        } else {
          console.log('Aborted');
          process.exit();
        }
      });
    });
    var ivl = setInterval(function () {
      wall.update(promise.getStatus() / 100);
    }, 1000);
    promise.then(function () {
      clearInterval(ivl);
    });
  });
}

prompt.start();
prompt.get(schema, function (err, result) {
  if (err) {
    console.error('Prompt error: ' + err.message);
    return;
  }
  init(result.group, result.username, result.password, result.find, result.author, result.startPage, result.endPage);
});
