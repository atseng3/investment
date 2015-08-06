'use strict';

window.Login = {
	init: function() {
		this.startParse();
	},
	formData: {
		login: {
			title: 'Sign in to AT Investing',
			disclaimer: 'Dont have an account? <a class="toggle-form">Create one now.</a>',
			buttonName: 'LOG IN',
			animation: 'slideOutUp'
		},
		signup: {
			title: 'Sign up for AT Investing',
			disclaimer: 'Already have an account? <a class="toggle-form">Log in.</a>',
			buttonName: 'SIGN UP',
			animation: 'slideInDown'
		}
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
			// do not focus for now: triggers iphone keyboard -- annoying
			// $('#name').focus();
			var switchto = $('form').data('switchto');
			var action = $('form').data('action');
			var $form = $('form');
			$form.find('.title').html(that.formData[switchto].title);
			$form.find('.'+action+'-disclaimer').hide();
			$form.find('.'+switchto+'-disclaimer').show();
			$form.data('switchto', action);
			$form.data('action', switchto);
			$('input#password-confirmation').removeClass().addClass(that.formData[switchto].animation);
			$('input#password-confirmation').attr('disabled') ? $('input#password-confirmation').removeAttr('disabled') : $('input#password-confirmation').attr('disabled');
			$('#submit-btn').html(that.formData[switchto].buttonName);
			
		});

		$('#demo-btn').click(function(event) {
			event.preventDefault();
			Parse.User.logIn('test-user', 'Testing1', {
				success: function(user) {
					window.location.href = '../';
				}
			});
		});

		$('form').submit(function(event) {
			event.preventDefault();
			var action = $(event.currentTarget).data('action');
			var $name = $('#name');
			var $password = $('#password');
			var $password_confirmation = $('#password-confirmation');
			if(action == 'login') {
				Parse.User.logIn($name.val(), $password.val(), {
					success: function(user) {
						// redirect to signed in homepage
						window.location.href = "../";
					},
					error: function(user, error) {
						$name.focus();
						$name.val('').addClass('shake');
						$password.val('').addClass('shake');
						setTimeout(function(){
							$name.removeClass();
							$password.removeClass();
						}, 1000);
					}
				});
			} else if(action == 'signup') {
				if($password.val() !== $password_confirmation.val()) {
					$password.val('').addClass('shake');
					$password_confirmation.val('').addClass('shake');
					setTimeout(function(){
						$password.removeClass();
						$password_confirmation.removeClass('shake');
					}, 1000);
					return false;
				}
				var user = new Parse.User();
				user.set('username', $name.val());
				user.set('password', $password.val());

				user.signUp(null, {
					success: function(user) {
						var UserPortfolios = Parse.Object.extend('UserPortfolios');
						var query = new Parse.Query(UserPortfolios);
						query.count().then(function(number) {
							var new_user_portfolio = new UserPortfolios();
							new_user_portfolio.set('user', user);
							new_user_portfolio.set('portfolioId', number+1);
							new_user_portfolio.set('cash', 0);
							return new_user_portfolio.save();
						}).then(function() {
							window.location.href = "../";
						});
					},
					error: function(user, error) {
						$name.focus();
						$name.val('').addClass('shake');
						$password.val('').addClass('shake');
						$password_confirmation.val('').addClass('shake');
						setTimeout(function(){
							$name.removeClass();
							$password.removeClass();
							$password_confirmation.removeClass('shake');
						}, 1000);
					}
				});
			}
		});
	},
	startParse: function() {
		Parse.initialize("2LZNpkBEtOWN6z6gkoyM5j9tl8XLsTggQb70O51b", "6U76pQ4YKLVKy3VOWhKk0V6l0qwhuzeAGQd7ycjf");
		if(Parse.User.current()) {
			Parse.User.logOut();
		}
		this.bindListeners();
	},
};
$(document).ready(function() {
	window.Login.init();
});