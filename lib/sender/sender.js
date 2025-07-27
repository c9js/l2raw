/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const path = require('path');
const { Worker } = require('worker_threads');
const EventEmitter = require('core/event-emitter/default-options');
const utils = require('../utils');

/*▄──────────────────────▄
  █                      █
  █  Создает передатчик  █
  █                      █
  ▀──────────────────────▀*/
module.exports = class extends EventEmitter.DefaultOptions {
/*┌────────────────────┐
  │ Опции по умолчанию │
  └────────────────────┘*/
    static defaultOptions = {
        iface:     'eth0', // Имя сетевого интерфейса
        delay:        100, // Задержка между пакетами  = 0.1 сек
        delayError: 60000, // Задержка после ошибки    =  60 сек
        timeout:    10000, // Время на отправку пакета =  10 сек
    }
    
/*┌─────────────┐
  │ Конструктор │
  └─────────────┘*/
    constructor(options) {
    // Сохраняем опции с учетом значений по умолчанию
        super(options);
        
    // Запускаем передатчик
        this.start();
    }
    
/*┌──────────────────────┐
  │ Запускает передатчик │
  └──────────────────────┘*/
    start=f=>{
    // Создаем новый воркер
        this.worker = new Worker(path.resolve(__dirname, 'worker.js'), {
        // Передаем опции в воркер
            workerData: {
                iface: this.options.iface, // Имя сетевого интерфейса
                delay: this.options.delay, // Задержка между пакетами
            }
        });
        
    // Добавляем обработчики
        [
            'message', // Обработчик отправки пакетов
            'error',   // Обработчик ошибок в воркере
            'exit'     // Обработчик аварийного завершения воркера
        ].forEach(event => this.worker.on(event, (res) => this[event](res)));
        
    // Добавляем обработчик запуска
        this.worker.once('online', () => {
        // Обновляем состояние воркера
            this.online = true;
            
        // Обновляем перезапуск по таймауту
            this.updateTimeout();
            
        // Передаем пакет в воркер
            if (this.packet) {
                this.worker.postMessage(this.packet);
            }
            
        // Сообщаем о запуске
            this.emit('start', !!this.packet);
        });
    }
    
/*┌──────────────────────────┐
  │ Останавливает передатчик │
  └──────────────────────────┘*/
    stop=async f=>{
    // Обновляем состояние воркера
        this.online = false;
        
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
    
/*┌──────────────────────────┐
  │ Перезапускает передатчик │
  └──────────────────────────┘*/
    restart = async (reason) => {
    // Сообщаем о перезапуске
        this.emit('restart', reason);
        
    // Останавливаем передатчик
        await this.stop();
        
    // Создаем задержку после ошибки
        if (reason == 'error') {
            await utils.sleep(this.options.delayError);
        }
        
    // Запускаем передатчик
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
            
        // Перезапускаем передатчик
            this.restart('timeout');
        },
        
        // Время на отправку пакета
            this.options.timeout
        );
    }
    
/*┌─────────────────────────────┐
  │ Обработчик отправки пакетов │
  └─────────────────────────────┘*/
    message = (bytesSent) => {
    // Обновляем перезапуск по таймауту
        this.updateTimeout();
        
    // Стартовый пакет еще не был передан в воркер
        if (bytesSent == -1) return;
        
    // Проверяем количество отправленных байт
        bytesSent = utils.validateBytesSent(bytesSent, this.packet);
        
    // Пакет отправлен не полностью
        if (bytesSent.error) {
            return this.error(bytesSent.error, bytesSent.type);
        }
        
    // Сообщаем об отправке пакета
        this.emit('data', this.packet);
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
        
    // Перезапускаем передатчик
        this.restart('error');
    }
    
/*┌────────────────────────────────────────┐
  │ Обновляет пакет для следующей отправки │
  └────────────────────────────────────────┘*/
    update = (packet) => {
    // Проверяем валидацию пакета
        packet = utils.validatePacket(packet);
        
    // Пакет не прошел валидацию
        if (packet.error) {
            return this.error(packet.error, packet.type);
        }
        
    // Обновляем пакет для следующей отправки
        this.packet = packet;
        
    // Передаем пакет в воркер
        if (this.online) {
            this.worker.postMessage(this.packet);
        }
        
    // Сообщаем об обновлении пакета
        this.emit('update', this.packet);
    }
};
