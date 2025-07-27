/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const path = require('path');
const EventEmitter = require('events');
const { Worker } = require('worker_threads');
const utils = require('../utils');

/*▄────────────────────▄
  █                    █
  █  Создает приемник  █
  █                    █
  ▀────────────────────▀*/
module.exports = class extends EventEmitter {
/*┌────────────────────────┐
  │ Параметры по умолчанию │
  └────────────────────────┘*/
    params = {
        iface:     'eth0', // Имя интерфейса
        delay:        100, // Задержка между пакетами   = 0.1 сек
        delayError: 60000, // Задержка после ошибки     =  60 сек
        timeout:   600000  // Время на получение пакета =  10 мин
    }
    
/*┌─────────────┐
  │ Конструктор │
  └─────────────┘*/
    constructor(params = {}) {
    // Вызываем конструктор родителя
        super();
        
    // Сохраняем параметры с учетом значений по умолчанию
        Object.assign(this.params, params);
        
    // Запускаем приемник
        this.start();
    }
    
/*┌────────────────────┐
  │ Запускает приемник │
  └────────────────────┘*/
    start=f=>{
    // Создаем новый воркер
        this.worker = new Worker(path.resolve(__dirname, 'worker.js'), {
        // Передаем параметры в воркер
            workerData: {
                iface:  this.params.iface, // Имя интерфейса
                delay:  this.params.delay  // Задержка между пакетами
            }
        });
        
    // Добавляем обработчики
        [
            'message', // Обработчик получения пакетов
            'error',   // Обработчик ошибок в воркере
            'exit'     // Обработчик аварийного завершения воркера
        ].forEach(event => this.worker.on(event, (res) => this[event](res)));
        
    // Добавляем обработчик запуска
        this.worker.once('online', () => {
        // Обновляем перезапуск по таймауту
            this.updateTimeout();
            
        // Сообщаем о запуске
            this.emit('start');
        });
    }
    
/*┌────────────────────────┐
  │ Останавливает приемник │
  └────────────────────────┘*/
    stop=async f=>{
    // Отменяем перезапуск по таймауту
        this.clearTimeout();
        
    // Проверяем текущий воркер
        if (this.worker) {
        // Удаляем все обработчики
            this.worker.removeAllListeners();
            
        // Останавливаем текущий воркер
            await this.worker.terminate();
            
        // Удаляем текущий воркер
            this.worker = null;
        }
        
    // Сообщаем об остановке
        this.emit('stop');
    }
    
/*┌────────────────────────┐
  │ Перезапускает приемник │
  └────────────────────────┘*/
    restart = async (reason) => {
    // Сообщаем о перезапуске
        this.emit('restart', reason);
        
    // Останавливаем приемник
        await this.stop();
        
    // Создаем задержку после ошибки
        if (reason == 'error') {
            await utils.sleep(this.params.delayError);
        }
        
    // Запускаем приемник
        this.start();
    }
    
/*┌─────────────────────────────────┐
  │ Отменяет перезапуск по таймауту │
  └─────────────────────────────────┘*/
    clearTimeout=f=>clearTimeout(this.timeoutId)
    
/*┌──────────────────────────────────┐
  │ Обновляет перезапуск по таймауту │
  └──────────────────────────────────┘*/
    updateTimeout=f=>{
    // Отменяем старый
        this.clearTimeout();
        
    // Добавляем новый
        this.timeoutId = setTimeout(() => {
        // Сообщаем о перезапуске по таймауту
            this.emit('timeout');
            
        // Перезапускаем приемник
            this.restart('timeout');
        },
        
        // Время на получение пакета
            this.params.timeout
        );
    }
    
/*┌──────────────────────────────┐
  │ Обработчик получения пакетов │
  └──────────────────────────────┘*/
    message = (packet) => {
    // Обновляем перезапуск по таймауту
        this.updateTimeout();
        
    // Не удалось получить пакет
        if (packet.error) {
            return this.error(packet.error, packet.type);
        }
        
    // Сообщаем о получении пакета
        this.emit('data', Buffer.from(packet));
    }
    
/*┌─────────────────────────────┐
  │ Обработчик ошибок в воркере │
  └─────────────────────────────┘*/
    error = (err, type = 'error') => this.emit('error', utils.formatError(type, err))
    
/*┌──────────────────────────────────────────┐
  │ Обработчик аварийного завершения воркера │
  └──────────────────────────────────────────┘*/
    exit = (code) => {
    // Сообщаем об аварийном завершении воркера
        this.emit('exit', code);
        
    // Перезапускаем приемник
        this.restart('error');
    }
};
