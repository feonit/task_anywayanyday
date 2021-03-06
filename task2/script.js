/*
 * Решение на тестовое задание Anywayanyday "Поиск рейсов авиакомпаний"
 *
 * author: Orlov Leonid
 * email: feonitu@yandex.ru
 * */


(function($, global){

	(new function Module() {

		//открыть доступ к модулю
		global.app = this;

		var that = this;

		//==============================================================================================
		//      Раздел получения данных
		//==============================================================================================

		// Счётчики
		var TIME_UPDATE_INFO = 10000,
			TIME_RECHECK_COMPLETED = 1000,
			id_task_update_info_timeout,
			id_task_recheck_completed_interval;

		// Память
		this.cashe = {};
		this.cashe.complate = 0;

		/**
		 * Шаблоны по предоставленному API сервиса, производящего поиск рейсов авиакомпаний
		 *
		 * */

		this.urlTemplates = {
			start : 'http://api.anywayanyday.com/api/NewRequest/?Route=2406MOWLON&AD=1&CN=0&CS=E&Partner=testapic&_Serialize=JSON',
			status : 'http://api.anywayanyday.com/api/RequestState/?R=${ID}&_Serialize=JSON',
			result : 'http://api.anywayanyday.com/api/Fares/?R=${ID}&V=Matrix&VB=true&L=ru&_Serialize=JSON'
		};

		/**
		 * Запуск поиска
		 *
		 * @this {Module}
		 * @public
		 * */

		this.requestStart = function(){
			var url = this.urlTemplates.start;

			this._sendAjaxRequest(url, function (data) {

				if ( data['Id'] ) {
					that._processSearch(data['Id']);
				}
			})
		};

		/**
		 * Запрос к сервису
		 *
		 * @param {String} url Адрес ресурса по предоставленному API
		 * @param {Function} handle Обработчик ответа
		 * @private
		 * */

		this._sendAjaxRequest = function(url, handle){
			$.ajax({
				url : url,
				type : 'GET',
				dataType: 'jsonp',
				crossDomain : true
			})

			.done( function(data) {
				if (data == null) {
					return alert('Не получены данные от сервиса!');
				}

				if (data['Error'] && data['Error'] !== null) {
					return alert('Сервис прислал ошибку: ' + data['Error']);
				}
				console.log(data);
				return handle(data);
			})

			.fail(function (jqXHR, textStatus, errorThrown) {
				alert('Запрос через AJAX был неудачен: ' + errorThrown);
			});
		};

		/**
		 * Для получения статуса поиска
		 *
		 * @this {Module}
		 * @param {String} id Идентификатор поискового запроса
		 * @param {Function} handle Обработчик результата
		 * @private
		 * */

		this._requestStatus = function(id, handle){
			var temp = this.urlTemplates.status,
				url = $.tmpl( temp, {	ID : id }).text();

			this._sendAjaxRequest(url, handle);
		};


		/**
		 * Для получения результата поиска
		 *
		 * @this {Module}
		 * @param {String} id Идентификатор поискового запроса
		 * @param {Function} handle Обработчик результата
		 * @private
		 * */

		this._requestResult = function(id, handle){
			var temp = this.urlTemplates.result,
				url = $.tmpl( temp, { ID : id}).text();

			this._sendAjaxRequest(url, handle);
		};

		/**
		 * Работа с поиском
		 *
		 * @this {Module}
		 * @param {String} id Идентификатор поискового запроса
		 * @private
		 * */

		this._processSearch = function(id){

			// Периодически
			id_task_recheck_completed_interval = setInterval(function(){

				// Опрашиваем статус
				that._requestStatus(id, function(data){


					// Пока не убедимся, что поиск завершён, запоминаем статус
					if ((that.cashe.complate = data['Completed']) && data['Completed'] == 100){

						// После чего останавливаем счетчик
						clearInterval(id_task_recheck_completed_interval);

						// Получаем результат поиска
						that._requestResult(id, function(data){
							that._endProcessSearch(data);
						})
					}
				});
			}, TIME_RECHECK_COMPLETED);
		};

		/**
		 * Завершение работы с поиском, работа с результатом
		 *
		 * @this {Module}
		 * @param {Object} data Результат поискового запроса
		 * @private
		 * **/

		this._endProcessSearch = function(data){

			// Обрабатываем данные
			this.parseData(data);

			// Показываем информацию
			this.initView();

			// Заказываем обновление информации
			id_task_update_info_timeout = setTimeout(function(){
				that.requestStart();
			}, TIME_UPDATE_INFO);
		};

	  //==============================================================================================
	  //      Раздел обработки и отображения данных
	  //==============================================================================================

		/**
		 * Алфавит авиакомпаний
		 *
		 * */

		this.cashe.member = {};

		/**
		 * Проверка и сохранение данных
		 *
		 * @param {Object} data Информация об авиакомпаниях
		 * */

		this.parseData = function (data){
			var airlines = data['Airlines'],
				i = airlines.length,
				member = that.cashe.member,
				airline,
				name,
				len,
				alpha,
				fare,
				id;

			//запоминаем информацию по каждой компании
			while (i--) {

				airline = airlines[i];
				name = airline['Name'];
				len = airline['FaresFull'].length;

				if (member[name]) {
					//если авиакомпания добавлена, обновляем алфавит рейсов
					alpha = member[name];

					while (len--) {
						fare = airline['FaresFull'][len];
						id = fare['FareId'];

						//если нет такой записи, добавляем
						if ( !alpha[id] ) {
							alpha[id] = fare;
						}
					}

				} else {
					//если нет
					alpha = {};

					while (len--) {
						fare = airline['FaresFull'][len];
						id = fare['FareId'];

						//сформировать алфавит рейсов по идентификаторам
						alpha[id] = fare;
					}
					//добавляем
					member[name] = alpha;
				}
			}
		};

		/**
		 * Создаёт отсортированный список имён авиакомпаний
		 *
		 * */

		this.createListOfAirlines = function () {
			return Object.keys(that.cashe.member).sort()
		};

		/**
		 * Вывести список авиакомпаний
		 *
		 * @param {Array} list Отсортированный список имён авиакомпаний
		 * */

		this.appendAirLine = function(list){

			var $divConteiner = $('.field-links'),
				$html = $('<ul>'),
				template = $('.link').text(),
				len = list.length;

			for (var i=0; i<len; i+=1){
			  $.tmpl(template, { name : list[i] }).appendTo($html);
			}

			$divConteiner.empty().append($html);
		};

		/**
		 * Отобразить информацию об авиакомпании
		 *
		 * @param {String} name Имя авиакомпании
		 * */

		this.appendFares = function(name){
			var fares = that.cashe.member[name],
				$divConteiner = $('.field-flight'),
				templateFares = $('.fares').text(),
				templateTrips = $('.trips').text(),
				$html = $('<div>');

			for (var id in fares ) {// if (!fares.hasOwnProperty(id)) return;
				var segments = fares[id]['Directions'][0]['Segments'];

				$.tmpl(templateFares, fares[id]).appendTo($html);

				segments.forEach(function(segment){
					segment['Trips'].forEach(function(trip){

						$.tmpl(templateTrips, trip).appendTo($html);

					})
				});

			}

			$divConteiner.empty().append($html);
		};

		/**
		 * Отображение страницы
		 *
		 * @this {Module}
		 * */

		this.initView = function(){
			var list = this.createListOfAirlines(),
				nameAirLine = location.hash.slice(1) || list[0]; // Дефолтная страница, по списку первая

			this.appendAirLine(list);
			this.appendFares(nameAirLine);
			this.bindEvents();

			// Показываем страницу один раз
			if (!this.initView.open) {
				this.showInfo();
				this.initView.open = true;
			}
		};

		/**
		 * Заменить страницу загрузки на страницу с информацией
		 *
		 * */

		this.showInfo = function(){
			$('.content-view, .message-view').toggleClass('hidden');
		};

		/**
		 * Привязка событий к пользовательскому интерфейсу (возможность переключаться)
		 *
		 * */

		this.bindEvents = function() {
			$('a').on('click', function(){
				that.appendFares($(this).text());
			});
		};

		/**
		 * Метод отображения хода загрузки
		 *
		 * */

		this.showProgress = function(){

			setInterval((function(){
				var $loading = $('.loading'),
					$complate = $('.complate ');

				return function(){
					$loading.text().length == 3 ? $loading.empty() : $loading.text($loading.text() + '.');
					$complate.text(that.cashe.complate);
				}
			})(), TIME_RECHECK_COMPLETED/5);
		};




		//==============================================================================================
		//      Работа с приложением
		//==============================================================================================

		/**
		 * Остановить приложение
		 *
		 * @this {Module}
		 * @deprecated
		 * @public
		 * */

		this.stop = function(){
			clearTimeout(id_task_update_info_timeout);
			clearInterval(id_task_recheck_completed_interval);
		};

		/**
		 * Стартовать приложение
		 *
		 * @this {Module}
		 * */

 		this.initApp = function(){

			// Сделать запрос информации
			this.requestStart();

			// Когда загрузится документ
			$(this.showProgress);

		};
	}).initApp();

})(jQuery, this);

