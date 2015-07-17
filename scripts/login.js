'use strict';

window.Login = {
	init: function() {
		this.startParse();
	},
	bindListeners: function() {
		var that = this;
	    $('#login').submit(function(event) {
	      event.preventDefault();

	      var $name = $('#login-name');
	      var $password = $('#login-password'); 

	      Parse.User.logIn($name.val(), $password.val(), {
	        success: function(user) {
	        	// redirect to signed in homepage
	        	window.location.href = "/";
	        },
	        error: function(user, error) {
	        	$name.val('').removeClass().addClass('shake');
	        	$password.val('').removeClass().addClass('shake');
	        }
	      });
	    });
	    $('#signup').submit(function(event) {
	      event.preventDefault();

	      var name = $('#signup-name').val();
	      var password = $('#signup-password').val();
	      var user = new Parse.User();
	      user.set('username', name);
	      user.set('password', password);

	      user.signUp(null, {
	        success: function(user) {
				// do something with the user object
				// that.checkLogin();
	        },
	        error: function(user, error) {
				// show errors and try again
	        }
	      });
	    });
	},
	checkLogin: function() {
		var loggedIn = false;
		if(Parse.User.current()) {
			loggedIn = true;
		}
		return loggedIn;
	},
	startParse: function() {
		Parse.initialize("2LZNpkBEtOWN6z6gkoyM5j9tl8XLsTggQb70O51b", "6U76pQ4YKLVKy3VOWhKk0V6l0qwhuzeAGQd7ycjf");
		if(this.checkLogin()) {
			// redirect to signed in homepage
		}
		this.bindListeners();
	},
};
$(document).ready(function() {
	window.Login.init();
});