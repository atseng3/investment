'use strict';

window.Login = {
	init: function() {
		this.startParse();
	},
	bindListeners: function() {
		var that = this;
		$('form').hover(function(event) {
			$('.logo').css('opacity', 1);
			$('#content').css('background-color', 'rgba(0,0,0,0.1)');
		}, function(event) {
			$('.logo').css('opacity', 0.3);
			$('#content').css('background-color', 'rgba(0,0,0,0.7)');
		});
		$('.toggle-form').on('click', function(event) {
			event.preventDefault();
			var rotate = 'rotateY(180deg)';
			if(event.target.id == 'login-link') {
				rotate = 'rotateY(0deg)';
			} else if(event.target.id == 'signup-link') {
				rotate = 'rotateY(180deg)';	
			}
			$('.container').css('transform', rotate);
		});
	    $('#login').submit(function(event) {
	      event.preventDefault();

	      var $name = $('#login-name');
	      var $password = $('#login-password'); 

	      Parse.User.logIn($name.val(), $password.val(), {
	        success: function(user) {
	        	// redirect to signed in homepage
	        	window.location.href = "../index.html";
	        },
	        error: function(user, error) {
	        	$name.val('').removeClass().addClass('shake');
	        	$password.val('').removeClass().addClass('shake');
	        }
	      });
	    });
	    $('#signup').submit(function(event) {
	      event.preventDefault();

	      var $name = $('#signup-name');
	      var $password = $('#signup-password');
	      var $password_confirmation = $('#signup-password-confirm');
	      if($password.val() !== $password_confirmation.val()) {
			$password.val('').removeClass().addClass('shake');
			$password_confirmation.val('').removeClass().addClass('shake');
			return false;
	      }
	      var user = new Parse.User();
	      user.set('username', $name.val());
	      user.set('password', $password.val());

	      user.signUp(null, {
	        success: function(user) {
	        	window.location.href = "../index.html";
	        },
	        error: function(user, error) {
	        	$name.val('').removeClass().addClass('shake');
				$password.val('').removeClass().addClass('shake');
				$password_confirmation.val('').removeClass().addClass('shake');
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