angular.module('itminderp', ['ui.router', 'satellizer', 'ngMaterial', 'ngMessages', 'textAngular'
]).constant('API_URL', 'http://localhost:8000/api/')
  .config(function ($stateProvider, $urlRouterProvider, $authProvider, $mdThemingProvider, $mdIconProvider, API_URL, $httpProvider, $provide) {
    $mdThemingProvider.theme('black')
      .primaryPalette('grey', {
        'default': '900'
      });
    $mdThemingProvider.setDefaultTheme('black');
    // Satellizer configuration that specifies which API
    // route the JWT should be retrieved from
    function redirectWhenLoggedOut($q, $injector) {

      return {
        responseError: function (rejection) {

          // Need to use $injector.get to bring in $state or else we get
          // a circular dependency error
          var $state = $injector.get('$state');

          // Instead of checking for a status code of 400 which might be used
          // for other reasons in Laravel, we check for the specific rejection
          // reasons to tell us if we need to redirect to the login state
          var rejectionReasons = ['token_not_provided', 'token_expired', 'token_absent', 'token_invalid'];

          // Loop through each rejection reason and redirect to the login
          // state if one is encountered
          angular.forEach(rejectionReasons, function (value, key) {

            if (rejection.data.error === value) {

              // If we get a rejection corresponding to one of the reasons
              // in our array, we know we need to authenticate the user so
              // we can remove the current user from local storage
              localStorage.removeItem('user');

              // Send the user to the auth state so they can login
              $state.go('auth');
            }
          });

          return $q.reject(rejection);
        }
      }
    }

    // Setup for the $httpInterceptor
    $provide.factory('redirectWhenLoggedOut', redirectWhenLoggedOut);

    // Push the new factory onto the $http interceptor array
    $httpProvider.interceptors.push('redirectWhenLoggedOut');
    $authProvider.loginUrl = API_URL + 'authenticate';
    $authProvider.httpInterceptor = true;
    $authProvider.withCredentials = true;
    $authProvider.tokenRoot = null;
    $authProvider.cordova = false;
    $authProvider.baseUrl = '/';
    $authProvider.tokenName = 'token';
    $authProvider.tokenPrefix = 'satellizer';
    $authProvider.authHeader = 'Authorization';
    $authProvider.authToken = 'Bearer';
    $authProvider.storageType = 'localStorage';

    // Redirect to the auth state if any other states
    // are requested other than users
    $urlRouterProvider.otherwise('/judgements');

    $stateProvider
      .state('auth', {
        url: '/auth',
        templateUrl: 'partials/authView.html',
        controller: 'AuthController as auth'
      })
      .state('users', {
        url: '/users',
        templateUrl: 'partials/userView.html',
        controller: 'UserController as user'
      }).state('subscriptions', {
        url: '/courts',
        templateUrl: 'partials/subscription.html',
        controller: 'SubscriptionController as subscription'
      }).state('judgements', {
        url: '/judgements',
        templateUrl: 'partials/judgements.html',
        controller: 'JudgementController as jg'
      });
  });

/**
 * Created by keshav-home on 31/7/15.
 */
'use strict';

angular
  .module('itminderp')
  .controller('UserController', UserController);

function UserController($http, $auth, $state,$rootScope) {
  var vm = this;
  vm.users;
  vm.error;
  vm.getUsers = function () {
    console.log($rootScope.authenticated);
    // This request will hit the index method in the AuthenticateController
    // on the Laravel side and will return the list of users
    $http.get('http://localhost:8000/api/users/').success(function (users) {

      vm.users = users;
    }).error(function (error) {
      vm.error = error;
    });
  };
 vm.getUsers();
}

/**
 * Created by keshav-home on 31/7/15.
 */
'use strict';

angular
  .module('itminderp')
  .controller('SubscriptionController', SubscriptionController);

function SubscriptionController($http, $state, API_URL) {
  var vm = this;

  vm.courts = [];
  vm.userCourts = [];
  vm.onSubmit = function () {
    $http.post(API_URL + 'courts', {courts: vm.userCourts}, {
      timeout: 300000
    })
      .success(function (res) {
        $state.go('judgements');
      })
      .error(function (err) {
        console.log(err);
      });
  };
  $http.get(API_URL + 'courts').success(function (response) {

    vm.courts = response.data;
  }).error(function (error) {
    vm.error = error;
  });
  $http.get(API_URL+'user/courts').success(function (response) {

    vm.userCourts = response.data;
  }).error(function (error) {
    vm.error = error;
  });
}

/**
 * Created by keshav-home on 3/11/15.
 */
'use strict';

angular
  .module('itminderp')
  .controller('JudgementController', JudgementController);

function JudgementController($http, API_URL) {
  var vm = this;

  vm.judgements = [];

  $http.get(API_URL + 'judgements').success(function (response) {
    vm.judgements = response.data;
  }).error(function (error) {
    vm.error = error;
  });

}

/**
 * Created by keshav-home on 31/7/15.
 */
'use strict';

angular
  .module('itminderp')
  .controller('AuthController', AuthController);


function AuthController($auth, $state, $http, $rootScope, API_URL) {

  var vm = this;
  vm.loginError = false;
  vm.loginErrorText = '';
  $rootScope.authenticated = $auth.isAuthenticated();
  vm.login = function () {

    var credentials = {
      email: vm.email,
      password: vm.password
    };

    $auth.login(credentials).then(function () {

      // Return an $http request for the now authenticated
      // user so that we can flatten the promise chain
      return $http.get(API_URL + 'authenticate/user');

      // Handle errors
    }, function (error) {
      vm.loginError = true;
      vm.loginErrorText = error.data.error;


      // Because we returned the $http.get request in the $auth.login
      // promise, we can chain the next promise to the end here
    }).then(function (response) {
      if (angular.isDefined(response)) {
        // Stringify the returned data to prepare it
        // to go into local storage
        var user = JSON.stringify(response.data.user);

        // Set the stringified user data into local storage
        localStorage.setItem('user', user);

        $rootScope.authenticated = true;
        // The user's authenticated state gets flipped to
        // true so we can now show parts of the UI that rely
        // on the user being logged in
        console.log($rootScope.authenticated);

        // Putting the user's data on $rootScope allows
        // us to access it anywhere across the app
        $rootScope.currentUser = response.data.user;

        // Everything worked out so we can now redirect to
        // the users state to view the data
        $state.go('subscriptions');
      }

    });
  };

  vm.logout = function () {

    $auth.logout().then(function () {

      // Remove the authenticated user from local storage
      localStorage.removeItem('user');

      // Flip authenticated to false so that we no longer
      // show UI elements dependant on the user being logged in
      $rootScope.authenticated = false;

      // Remove the current user info from rootscope
      $rootScope.currentUser = null;
      $state.go('auth');

      //
    });
  }
}

(function(module) {
try {
  module = angular.module('itminderp');
} catch (e) {
  module = angular.module('itminderp', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/itminderp/partials/authView.html',
    '<div class="row middle-xs" style="height: 100%"><div class="col-xs-offset-4 col-xs-4"><md-card><div class="col-xs-4 col-xs-offset-4"><h3>Login</h3></div><md-divider></md-divider><md-card-content><p>{{auth.loginErrorText}}</p><form name="login" class="ng-pristine ng-valid-email ng-invalid ng-invalid-required"><md-input-container class="md-cyan-theme"><label for="email" translate="" class="ng-scope">Email</label><input id="email" label="email" name="email" type="email" ng-model="auth.email" required class="ng-pristine ng-untouched md-input ng-valid-email ng-invalid ng-invalid-required" tabindex="0" aria-required="true" aria-invalid="true"><div ng-messages="login.email.$error" aria-live="assertive" class="ng-active"><div ng-message="" when="required" class="ng-scope"><span translate="" class="ng-scope">Please enter your email address.</span></div></div></md-input-container><md-input-container class="md-cyan-theme"><label for="password" translate="" class="ng-scope">Password</label><input id="password" label="password" name="password" type="password" ng-model="auth.password" required class="ng-pristine ng-untouched md-input ng-invalid ng-invalid-required" tabindex="0" aria-required="true" aria-invalid="true"><div ng-messages="" for="login.password.$error" aria-live="assertive" class="ng-active"><div ng-message="" when="required" class="ng-scope"><span translate="" class="ng-scope">Please enter your password.</span></div></div></md-input-container><md-button type="button" class="md-raised no-margin" ng-click="auth.login()" ng-disabled="login.$invalid">Login</md-button></form></md-card-content></md-card></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('itminderp');
} catch (e) {
  module = angular.module('itminderp', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/itminderp/partials/judgements.html',
    '<div ng-cloak><md-content><md-list><md-subheader class="md-no-sticky">Judgements</md-subheader><md-list-item class="md-3-line" ng-repeat="judgement in jg.judgements"><div class="md-list-item-text" layout="column"><h4>{{ judgement.courtName}}</h4><p>{{ judgement.appellant }} vs. {{judgement.respondent}}</p><p>{{ judgement.description}}</p><md-divider></md-divider></div></md-list-item></md-list></md-content></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('itminderp');
} catch (e) {
  module = angular.module('itminderp', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/itminderp/partials/subscription.html',
    '<div class="row"><div class="col-xs-6"><h3>Choose courts</h3><md-select multiple ng-model="subscription.userCourts"><md-option ng-repeat="court in subscription.courts" value="{{court.id}}">{{court.name}}</md-option></md-select><md-button ng-click="subscription.onSubmit()" class="md-raised">Submit</md-button></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('itminderp');
} catch (e) {
  module = angular.module('itminderp', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/itminderp/partials/userView.html',
    '<div class="row"><div class="col-xs-6"><h3>Users</h3><ul class="list-group" ng-if="user.users"><li class="list-group-item" ng-repeat="user in user.users"><h4>{{user.name}}</h4><h5>{{user.email}}</h5></li></ul><div class="alert alert-danger" ng-if="user.error"><strong>There was an error:</strong> {{user.error.error}}<br>Please go back and login again</div></div></div>');
}]);
})();
