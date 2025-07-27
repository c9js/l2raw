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
/*┌──────────────────┐
  │ Создает задержку │
  └──────────────────┘*/
    /**
     * Асинхронная пауза (задержка) на указанное количество миллисекунд
     * Пример:
     *     await sleep(1000)
     * 
     * @param {number} ms - Количество миллисекунд
     * @returns {Promise<void>}
     */
    sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
    
/*┌───────────────────────────────────────────────────────────────┐
  │ Регистрирует глобальные обработчики ошибок на уровне процесса │
  └───────────────────────────────────────────────────────────────┘*/
    registerExceptionHandlers = (postMessage) => [
        'uncaughtException', // Обработчик синхронных ошибок
        'unhandledRejection' // Обработчик асинхронных ошибок
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
            stack:   err.stack                   // Стек вызовов
        }
    })
    
/*┌────────────────────────────────────────┐
  │ Проверяет количество отправленных байт │
  └────────────────────────────────────────┘*/
    validateBytesSent = (bytesSent, packet) => {
    // Не удалось отправить пакет
        if (bytesSent.error) return bytesSent;
        
    // Уменьшаем на длину MAC-адреса (первые 6 байт пакета)
        bytesSent -= 6;
        
    // Пакет отправлен не полностью
        if (bytesSent != packet.length) {
            return {
            // Тип события
                type: 'dataSendError',
                
            // Информация об ошибке
                error: new Error([
                    'Пакет отправлен не полностью!',
                    `Отправлено байт: ${bytesSent} из ${packet.length}`
                ].join('\n'))
            }
        }
        
    // Проверка прошла успешно
        return bytesSent;
    }
    
/*┌────────────────────────────┐
  │ Проверяет валидацию пакета │
  └────────────────────────────┘*/
    validatePacket = (packet) => {
    // Проверяем валидацию пакета
        try {
        // Тип пакета должен быть Buffer
            if (!Buffer.isBuffer(packet)) {
                throw new TypeError([
                    'Тип пакета должен быть Buffer!',
                    `Текущий тип: ${typeof packet}`,
                    `Текущий пакет: ${
                        util.inspect(packet, {depth:1, maxArrayLength:10}
                    )}`,
                ].join('\n'));
            }
            
        // Пакет должен быть минимум 8 байт
            if (packet.length < 8) {
                throw new RangeError([
                    'Длина пакета должна быть минимум 8 байт!',
                    `Текущая длина: ${packet.length}`,
                    `Текущий пакет: ${packet.toString('hex')}`
                ].join('\n'));
            }
            
        // Пакет должен быть максимум 1508 байт
            if (packet.length > 1508) {
                throw new RangeError([
                    'Длина пакета должна быть максимум 1508 байт!',
                    `Текущая длина: ${packet.length}`,
                    `Текущий пакет: ${packet.toString('hex')}`
                ].join('\n'));
            }
        }
        
    // Пакет не прошел валидацию
        catch (error) {
            return {
                type: 'validatePacket', // Тип события
                error: error            // Информация об ошибке
            }
        }
        
    // Проверка прошла успешно
        return packet;
    }
};
