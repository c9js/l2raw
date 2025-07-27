/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const util = require('util');

/*▄──────────────────────────────────▄
  █                                  █
  █  Список вспомогательных функции  █
  █                                  █
  ▀──────────────────────────────────▀*/
module.exports = new class {
/*┌─────────────────┐
  │ Список констант │
  └─────────────────┘*/
    MAC_SIZE  = 6;                                 // Размер MAC-адреса (6 байт)
    BROADCAST = Buffer.alloc(this.MAC_SIZE, 0xFF); // Broadcast-адрес (FF:FF:FF:FF:FF:FF)
    
/*┌──────────────────┐
  │ Создает задержку │
  └──────────────────┘*/
    sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
    
/*┌───────────────────────────────────────────────────────────────┐
  │ Регистрирует глобальные обработчики ошибок на уровне процесса │
  └───────────────────────────────────────────────────────────────┘*/
    registerExceptionHandlers = (postMessage) => [
        'uncaughtException',  // Обработчик синхронных ошибок
        'unhandledRejection', // Обработчик асинхронных ошибок
    ].forEach(type => process.on(type, (error) => {
    // Сообщаем об ошибке
        postMessage(this.formatError(type, error));
        
    // Завершаем процесс
        process.exit(1);
    }))
    
/*┌───────────────────────────────┐
  │ Формирует сообщение об ошибке │
  └───────────────────────────────┘*/
    formatError = (type, err) => ({
    // Тип события
        type: type,
        
    // Информация об ошибке
        error: {
            name:    err.name,                   // Имя
            message: err.message || String(err), // Сообщение
            stack:   err.stack,                  // Стек вызовов
        }
    })
    
/*┌─────────────────────┐
  │ Проверяет MAC-адрес │
  └─────────────────────┘*/
    macFilter = (packet, mac) => {
    // Определяем значение по умолчанию для MAC-адреса
        mac = mac || this.BROADCAST; // Broadcast-адрес (FF:FF:FF:FF:FF:FF)
        
    // Проходим по списку байт MAC-адреса
        for (let i = 0; i < this.MAC_SIZE; i++) {
        // Проверяем текущий байт
            if (packet[i] != mac[i]) {
                return false;
            }
        }
        
    // Проверка прошла успешно
        return true;
    }
    
/*┌────────────────────────────────────────┐
  │ Проверяет количество отправленных байт │
  └────────────────────────────────────────┘*/
    validateBytesSent = (bytesSent, packetBuffer) => {
    // Не удалось отправить пакет
        if (bytesSent.error) return bytesSent;
        
    // Уменьшаем на размер MAC-адреса (первые 6 байт пакета)
        bytesSent -= this.MAC_SIZE;
        
    // Пакет отправлен не полностью
        if (bytesSent != packetBuffer.length) {
            return {
            // Тип события
                type: 'dataSendError',
                
            // Информация об ошибке
                error: new Error([
                    'Пакет отправлен не полностью!',
                    `Отправлено байт: ${bytesSent} из ${packetBuffer.length}`,
                ].join('\n'))
            }
        }
        
    // Проверка прошла успешно
        return bytesSent;
    }
    
/*┌────────────────────────────────┐
  │ Проверяет валидацию MAC-адреса │
  └────────────────────────────────┘*/
    validateMac = (macBuffer) => {
    // Проверяем валидацию MAC-адреса
        try {
        // Тип MAC-адреса должен быть Buffer
            if (!Buffer.isBuffer(macBuffer)) {
                throw new TypeError([
                    'Тип MAC-адреса должен быть Buffer!',
                    `Текущий тип: ${typeof macBuffer}`,
                    `Текущий MAC-адрес: ${
                        util.inspect(macBuffer, {depth:1, maxArrayLength:10})
                    }`,
                ].join('\n'));
            }
            
        // MAC-адрес должен быть 6 байт
            if (macBuffer.length != this.MAC_SIZE) {
                throw new RangeError([
                    `Размер MAC-адреса должен быть ${this.MAC_SIZE} байт!`,
                    `Текущий размер: ${macBuffer.length}`,
                    `Текущий MAC-адрес: ${macBuffer.toString('hex')}`,
                ].join('\n'));
            }
        }
        
    // MAC-адрес не прошел валидацию
        catch (error) {
            return {
                type: 'validateMac', // Тип события
                error: error,        // Информация об ошибке
            }
        }
        
    // Проверка прошла успешно
        return macBuffer;
    }
    
/*┌────────────────────────────┐
  │ Проверяет валидацию пакета │
  └────────────────────────────┘*/
    validatePacket = (packetBuffer) => {
    // Проверяем валидацию пакета
        try {
        // Тип пакета должен быть Buffer
            if (!Buffer.isBuffer(packetBuffer)) {
                throw new TypeError([
                    'Тип пакета должен быть Buffer!',
                    `Текущий тип: ${typeof packetBuffer}`,
                    `Текущий пакет: ${
                        util.inspect(packetBuffer, {depth:1, maxArrayLength:10})
                    }`,
                ].join('\n'));
            }
            
        // Пакет должен быть минимум 8 байт
            if (packetBuffer.length < 8) {
                throw new RangeError([
                    'Размер пакета должен быть минимум 8 байт!',
                    `Текущий размер: ${packetBuffer.length}`,
                    `Текущий пакет: ${packetBuffer.toString('hex')}`,
                ].join('\n'));
            }
            
        // Пакет должен быть максимум 1508 байт
            if (packetBuffer.length > 1508) {
                throw new RangeError([
                    'Размер пакета должен быть максимум 1508 байт!',
                    `Текущий размер: ${packetBuffer.length}`,
                    `Текущий пакет: ${packetBuffer.toString('hex')}`,
                ].join('\n'));
            }
        }
        
    // Пакет не прошел валидацию
        catch (error) {
            return {
                type: 'validatePacket', // Тип события
                error: error,           // Информация об ошибке
            }
        }
        
    // Проверка прошла успешно
        return packetBuffer;
    }
};
