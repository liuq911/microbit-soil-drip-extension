//% color="#3C9D4E" weight=90 icon="\uf043" block="土壤滴灌挑戰"
namespace SoilDripChallenge {
    let LEVEL_VALUE: number[] = [800, 608, 415, 223, 30]
    let CELL_DELAY_MS = 1000

    let soilLevel: number[] = []
    let sensorDistance = 0
    let sensorX = 2
    let sensorY = 2

    let targetLevel = 2
    let targetValue = 415
    let dropCount = 0
    let started = false
    let startTime = 0
    let stopDripping = false

    let aEnabled = false
    let bEnabled = false

    function ensureInit() {
        if (soilLevel.length == 25) return

        soilLevel = []
        for (let i = 0; i <= 24; i++) {
            soilLevel.push(0)
        }
    }

    function resetState() {
        soilLevel = []
        ensureInit()

        sensorDistance = 0
        sensorX = 2
        sensorY = 2

        dropCount = 0
        started = false
        startTime = 0
        stopDripping = false

        basic.clearScreen()
    }

    function setSensorPositionInternal() {
        if (sensorDistance == 0) {
            sensorX = 2
            sensorY = 2
        } else if (sensorDistance == 1) {
            sensorX = 3
            sensorY = 2
        } else if (sensorDistance == 2) {
            sensorX = 4
            sensorY = 2
        } else if (sensorDistance == 3) {
            sensorX = 4
            sensorY = 3
        } else {
            sensorX = 4
            sensorY = 4
        }
    }

    function cellDistance(x: number, y: number): number {
        return Math.abs(x - 2) + Math.abs(y - 2)
    }

    function levelToBrightness(level: number): number {
        if (level <= 0) return 0
        if (level == 1) return 70
        if (level == 2) return 130
        if (level == 3) return 195
        return 255
    }

    function drawSoil() {
        ensureInit()

        for (let y = 0; y <= 4; y++) {
            for (let x = 0; x <= 4; x++) {
                let i = y * 5 + x
                let level = soilLevel[i]

                if (level <= 0) {
                    led.unplot(x, y)
                } else {
                    led.plotBrightness(x, y, levelToBrightness(level))
                }
            }
        }
    }

    function flashSensor() {
        drawSoil()
        led.plotBrightness(sensorX, sensorY, 255)
        basic.pause(180)
        drawSoil()
    }

    function sensorLevelInternal(): number {
        ensureInit()
        return soilLevel[sensorY * 5 + sensorX]
    }

    function sensorValueInternal(): number {
        let lv = sensorLevelInternal()
        if (lv < 0) lv = 0
        if (lv > 4) lv = 4
        return LEVEL_VALUE[lv]
    }

    function elapsedSecondsInternal(): number {
        if (!started) return 0
        return Math.round((control.millis() - startTime) / 100) / 10
    }

    function judgeInternal() {
        let value = sensorValueInternal()

        serial.writeString("目前感測值=")
        serial.writeNumber(value)
        serial.writeString("  目標值=")
        serial.writeNumber(targetValue)
        serial.writeString("  距離=")
        serial.writeNumber(sensorDistance)
        serial.writeString("  已滴=")
        serial.writeNumber(dropCount)
        serial.writeString("滴  時間=")
        serial.writeNumber(elapsedSecondsInternal())
        serial.writeLine("秒")

        if (value > targetValue) {
            stopDripping = false
            serial.writeLine("太乾：請再滴水")
        } else if (value < targetValue) {
            stopDripping = true
            serial.writeLine("太濕：停止滴水")
        } else {
            stopDripping = true
            serial.writeLine("太棒了：剛好達標！")
        }
    }

    function spreadOneDrop() {
        let newLevel = dropCount
        if (newLevel > 4) newLevel = 4

        for (let distance = 0; distance <= 4; distance++) {
            for (let y = 0; y <= 4; y++) {
                for (let x = 0; x <= 4; x++) {
                    if (cellDistance(x, y) == distance) {
                        let i = y * 5 + x
                        if (newLevel > soilLevel[i]) {
                            soilLevel[i] = newLevel
                        }
                    }
                }
            }

            drawSoil()

            if (distance < 4) {
                basic.pause(CELL_DELAY_MS)
            }
        }
    }

    //% blockId=soil_challenge_start
    //% block="開始土壤濕度挑戰"
    //% weight=100
    export function startChallenge(): void {
        resetState()

        targetLevel = randint(1, 4)
        targetValue = LEVEL_VALUE[targetLevel]

        serial.writeLine("")
        serial.writeLine("=== 土壤濕度控制挑戰 ===")
        serial.writeString("目標感測值 = ")
        serial.writeNumber(targetValue)
        serial.writeLine("")
        serial.writeLine("A：設定感測器位置")
        serial.writeLine("B：滴水")
        serial.writeLine("數值越低代表越濕")
        serial.writeLine("四階：608 / 415 / 223 / 30")
        serial.writeLine("")

        flashSensor()
    }

    //% blockId=soil_challenge_enable_a
    //% block="按 A 設定感測器位置"
    //% weight=90
    export function enableSensorPositionButton(): void {
        if (aEnabled) return
        aEnabled = true

        input.onButtonPressed(Button.A, function () {
            if (started) {
                serial.writeLine("實驗已開始，感測器位置已鎖定")
                return
            }

            sensorDistance += 1
            if (sensorDistance > 4) {
                sensorDistance = 0
            }

            setSensorPositionInternal()

            serial.writeString("感測器距離=")
            serial.writeNumber(sensorDistance)
            serial.writeString("  位置=(")
            serial.writeNumber(sensorX)
            serial.writeString(",")
            serial.writeNumber(sensorY)
            serial.writeLine(")")

            flashSensor()
        })
    }

    //% blockId=soil_challenge_enable_b
    //% block="按 B 滴水並自動擴散判斷"
    //% weight=80
    export function enableDripButton(): void {
        if (bEnabled) return
        bEnabled = true

        input.onButtonPressed(Button.B, function () {
            if (stopDripping) {
                judgeInternal()
                return
            }

            if (!started) {
                started = true
                startTime = control.millis()
            }

            if (dropCount >= 4) {
                stopDripping = true
                serial.writeLine("已滴4滴，中心已達飽和下限30")
                judgeInternal()
                return
            }

            dropCount += 1

            serial.writeLine("")
            serial.writeString("第 ")
            serial.writeNumber(dropCount)
            serial.writeLine(" 滴")

            spreadOneDrop()
            judgeInternal()
        })
    }

    //% blockId=soil_challenge_show_data
    //% block="顯示目前實驗資料"
    //% weight=70
    export function showCurrentData(): void {
        judgeInternal()
    }

    //% blockId=soil_challenge_on_target
    //% block="目前濕度剛好達標"
    //% weight=60
    export function isOnTarget(): boolean {
        return sensorValueInternal() == targetValue
    }

    //% blockId=soil_challenge_reset
    //% block="重設土壤實驗"
    //% weight=50
    export function resetExperiment(): void {
        resetState()
        serial.writeLine("實驗已重設")
        flashSensor()
    }
}
