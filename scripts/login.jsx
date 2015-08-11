var Form = React.createClass({
	formData: {
		login: {
			formType: 'login',
			title: 'Sign in to AT Investing',
			disclaimerText: "Don't have an account? ",
			disclaimerAction: 'Create one now.',
			buttonName: 'LOG IN',
			animation: 'slideOutUp'
		},
		signup: {
			formType: 'signup',
			title: 'Sign up for AT Investing',
			disclaimerText: 'Already have an account? ',
			disclaimerAction: 'Log in.',
			buttonName: 'SIGN UP',
			animation: 'slideInDown'
		}
	},
	getInitialState: function () {
		var data = this.formData['login'];
	    return {
	    	formType: data.formType,
	    	title: data.title,
	    	disclaimerText: data.disclaimerText,
	    	disclaimerAction: data.disclaimerAction,
	    	buttonName: data.buttonName,
	    	animation: ''
	    };
	},
	componentDidMount: function () {
	    Parse.initialize("2LZNpkBEtOWN6z6gkoyM5j9tl8XLsTggQb70O51b", "6U76pQ4YKLVKy3VOWhKk0V6l0qwhuzeAGQd7ycjf");
		if(Parse.User.current()) {
			Parse.User.logOut();
		}  
	},
	toggleForm: function(event) {
		event.preventDefault();
		var action = this.state.formType === 'login' ? 'signup' : 'login';
		var data = this.formData[action];
		this.setState(data);
	},
	demoLogin: function(event) {
		event.preventDefault();

		Parse.User.logIn('test-user', 'Testing1', {
			success: function(user) {
				Parse.Analytics.track('login', {category: 'test-user'});
				window.location.href = '../';
			}
		});
	},
	handleSubmit: function(event) {
		event.preventDefault();

		var $name = $('#name');
		var $password = $('#password');
		var $password_confirmation = $('#password-confirmation');

		if(this.state.formType === 'login') {
			Parse.User.logIn($name.val(), $password.val(), {
				success: function(user) {
					Parse.Analytics.track('login', {category: 'normal-user'});
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
		} else {
			if($password.val() !== $password_confirmation.val() || $password.val().length < 5) {
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
	},
	render: function() {
		var disabled = this.state.formType === 'login' ? true : false;
		return (
			<div id="content">
				<div className="logo icon-logo-fat"></div>
				<div className="container">
					<form onSubmit={this.handleSubmit}>
						<div className="title">{this.state.title}</div>
						<input id="name" type="text" placeholder="username" autocomplete="off" autofocus required />
						<input id="password" type="password" placeholder="password" required />
						<input className={this.state.animation} id="password-confirmation" type="password" placeholder="confirm password" disabled={disabled} />

						<div className="submit-btn-container">
							<button type="submit" id="submit-btn" className="btn">{this.state.buttonName}</button>
							<button type="button" id="demo-btn" onClick={this.demoLogin} className="btn">VIEW DEMO</button>
						</div>
						<div className="disclaimer" onClick={this.toggleForm}>{this.state.disclaimerText} <a>{this.state.disclaimerAction}</a></div>
					</form>
			  	</div>
			</div>
		)
	}
});

React.render(
	<Form />,
	document.body
);