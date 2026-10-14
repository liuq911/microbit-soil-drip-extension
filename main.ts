//% color="#3C9D4E" weight=90 icon="\uf043" block="土壤滴灌控制"
namespace SoilDripControl {
    let DRY_VALUE = 800
    let SATURATED_VALUE = 30
    let DEFAULT_LOW = 100
    let DEFAULT_HIGH = 200

    let CELL_DELAY_MS = 1000
    let EVAP_INTERVAL_MS = 4000
    let EVAP_AMOUNT = 0.12

    let REQUIRED_DROPS: number[] = [2, 3, 4, 5, 6]
    let water: number[] = []

    let sensorDistance = 0
    let sensorX = 2
    let sensorY = 2

    let started = false
    let startTime = 0
    let dropCount = 0

    let aEnabled = false
    let bEnabled = false
    let evaporationStarted = false

    let autoRunning = false
    let autoLow = 100
    let autoHigh = 200
    let autoCheckMs = 2000

    function ensureInit() {
        if (water.length == 25) return
        water = []
        for (let i = 0; i <= 24; i++) water.push(0)
    }

    function resetState() {
        water = []
        ensureInit()
        sensorDistance = 0
        sensorX = 2
        sensorY = 2
        started = false
        startTime = 0
        dropCount = 0
        autoRunning = false
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

    function elapsedSecondsInternal(): number {
        if (!started) return 0
        return Math.round((control.millis() - startTime) / 100) / 10
    }

    function waterToBrightness(units: number): number {
        if (units <= 0) return 0
        let brightness = Math.round(units * 255 / 6)
        if (brightness < 25) brightness = 25
        if (brightness > 255) brightness = 255
        return brightness
    }

    function drawSoil() {
        ensureInit()
        for (let y = 0; y <= 4; y++) {
            for (let x = 0; x <= 4; x++) {
                let i = y * 5 + x
                let b = waterToBrightness(water[i])
                if (b <= 0) led.unplot(x, y)
                else led.plotBrightness(x, y, b)
            }
        }
    }

    function flashSensor() {
        drawSoil()
        led.plotBrightness(sensorX, sensorY, 255)
        basic.pause(180)
        drawSoil()
    }

    function sensorValueInternal(): number {
        ensureInit()
        let units = water[sensorY * 5 + sensorX]
        let need = REQUIRED_DROPS[sensorDistance]
        let reductionPerDrop = 650 / need
        let value = Math.round(DRY_VALUE - units * reductionPerDrop)
        if (value < SATURATED_VALUE) value = SATURATED_VALUE
        if (value > DRY_VALUE) value = DRY_VALUE
        return value
    }

    function printCurrentData() {
        serial.writeString("感測值=")
        serial.writeNumber(sensorValueInternal())
        serial.writeString("  距離=")
        serial.writeNumber(sensorDistance)
        serial.writeString("  滴數=")
        serial.writeNumber(dropCount)
        serial.writeString("  時間=")
        serial.writeNumber(elapsedSecondsInternal())
        serial.writeLine("秒")
    }

    function judgeRange(low: number, high: number) {
        let value = sensorValueInternal()
        printCurrentData()
        if (value > high) serial.writeLine("太乾：需要滴水")
        else if (value < low) serial.writeLine("太濕：停止滴水")
        else serial.writeLine("太棒了：濕度達標")
    }

    function dropAndSpreadInternal() {
        ensureInit()

        if (!started) {
            started = true
            startTime = control.millis()
        }

        dropCount += 1
        serial.writeLine("")
        serial.writeString("第 ")
        serial.writeNumber(dropCount)
        serial.writeLine(" 滴開始擴散")

        for (let distance = 0; distance <= 4; distance++) {
            for (let y = 0; y <= 4; y++) {
                for (let x = 0; x <= 4; x++) {
                    if (cellDistance(x, y) == distance) {
                        water[y * 5 + x] += 1
                        if (water[y * 5 + x] > 8) water[y * 5 + x] = 8
                    }
                }
            }

            drawSoil()

            if (distance == sensorDistance) {
                serial.writeString("水到達感測器：")
                serial.writeNumber(elapsedSecondsInternal())
                serial.writeString("秒  感測值=")
                serial.writeNumber(sensorValueInternal())
                serial.writeLine("")
            }

            if (distance < 4) basic.pause(CELL_DELAY_MS)
        }
    }

    function startEvaporationInternal() {
        if (evaporationStarted) return
        evaporationStarted = true

        control.inBackground(function () {
            while (true) {
                basic.pause(EVAP_INTERVAL_MS)

                ensureInit()
                let changed = false

                for (let i = 0; i <= 24; i++) {
                    if (water[i] > 0) {
                        water[i] -= EVAP_AMOUNT
                        if (water[i] < 0) water[i] = 0
                        changed = true
                    }
                }

                if (changed) drawSoil()
            }
        })
    }

    //% blockId=soil_control_start
    //% block="開始土壤濕度控制實驗"
    //% weight=100
    export function startExperiment(): void {
        resetState()
        startEvaporationInternal()

        serial.writeLine("")
        serial.writeLine("=== 土壤濕度控制實驗 ===")
        serial.writeLine("控制目標：100 ~ 200")
        serial.writeLine("800 = 乾；數值越低越濕")
        serial.writeLine("A：選感測器位置")
        serial.writeLine("B：依判斷滴水")
        serial.writeLine("水每1秒擴散1格")
        serial.writeLine("系統同時持續蒸發")
        serial.writeLine("")

        flashSensor()
    }

    //% blockId=soil_control_button_a
    //% block="按 A 設定感測器位置"
    //% weight=90
    export function enableSensorButton(): void {
        if (aEnabled) return
        aEnabled = true

        input.onButtonPressed(Button.A, function () {
            if (started || autoRunning) {
                serial.writeLine("控制已開始，感測器位置已鎖定")
                return
            }

            sensorDistance += 1
            if (sensorDistance > 4) sensorDistance = 0

            setSensorPositionInternal()

            serial.writeString("感測器距離=")
            serial.writeNumber(sensorDistance)
            serial.writeString("  預計約需")
            serial.writeNumber(REQUIRED_DROPS[sensorDistance])
            serial.writeLine("滴可到約150")

            flashSensor()
        })
    }

    //% blockId=soil_control_button_b
    //% block="按 B 判斷並控制滴水"
    //% weight=80
    export function enableManualControlButton(): void {
        if (bEnabled) return
        bEnabled = true

        input.onButtonPressed(Button.B, function () {
            if (autoRunning) {
                serial.writeLine("目前正在自動控制")
                return
            }

            let value = sensorValueInternal()

            if (value > DEFAULT_HIGH) {
                serial.writeLine("太乾：滴1滴")
                dropAndSpreadInternal()
                judgeRange(DEFAULT_LOW, DEFAULT_HIGH)
            } else if (value < DEFAULT_LOW) {
                serial.writeLine("太濕：停止滴水")
                printCurrentData()
            } else {
                serial.writeLine("太棒了：濕度達標，不滴水")
                printCurrentData()
            }
        })
    }

    //% blockId=soil_control_show
    //% block="顯示目前控制資料"
    //% weight=70
    export function showCurrentData(): void {
        judgeRange(DEFAULT_LOW, DEFAULT_HIGH)
    }

    //% blockId=soil_control_evaporation
    //% block="啟動土壤蒸發模擬"
    //% weight=65
    export function startEvaporation(): void {
        startEvaporationInternal()
        serial.writeLine("蒸發模擬已啟動")
    }

    //% blockId=soil_control_sensor_value
    //% block="目前感測器數值"
    //% weight=60
    export function sensorValue(): number {
        return sensorValueInternal()
    }

    //% blockId=soil_control_one_drop
    //% block="滴一滴並完成擴散"
    //% weight=55
    export function oneDropAndSpread(): void {
        dropAndSpreadInternal()
    }

    //% blockId=soil_control_auto
    //% block="自動控制濕度 下限 %low 上限 %high 每 %checkSeconds 秒檢查"
    //% low.defl=100 high.defl=200 checkSeconds.defl=2
    //% low.min=30 low.max=799
    //% high.min=31 high.max=800
    //% checkSeconds.min=1 checkSeconds.max=30
    //% weight=50
    export function autoControl(low: number, high: number, checkSeconds: number): void {
        if (autoRunning) return

        if (low >= high) {
            serial.writeLine("設定錯誤：下限必須小於上限")
            return
        }

        autoLow = low
        autoHigh = high
        autoCheckMs = Math.round(checkSeconds * 1000)
        autoRunning = true

        if (!started) {
            started = true
            startTime = control.millis()
        }

        startEvaporationInternal()

        serial.writeLine("")
        serial.writeString("自動控制開始：")
        serial.writeNumber(autoLow)
        serial.writeString(" ~ ")
        serial.writeNumber(autoHigh)
        serial.writeLine("")

        control.inBackground(function () {
            while (autoRunning) {
                let value = sensorValueInternal()

                if (value > autoHigh) {
                    serial.writeLine("AUTO：太乾 -> 滴1滴")
                    dropAndSpreadInternal()
                    judgeRange(autoLow, autoHigh)
                } else if (value < autoLow) {
                    serial.writeLine("AUTO：太濕 -> 等待蒸發")
                    printCurrentData()
                } else {
                    serial.writeLine("AUTO：濕度正常 -> 等待")
                    printCurrentData()
                }

                basic.pause(autoCheckMs)
            }
        })
    }

    //% blockId=soil_control_stop_auto
    //% block="停止自動控制"
    //% weight=40
    export function stopAutoControl(): void {
        autoRunning = false
        serial.writeLine("自動控制已停止")
    }

    //% blockId=soil_control_reset
    //% block="重設土壤控制實驗"
    //% weight=30
    export function resetExperiment(): void {
        resetState()
        serial.writeLine("土壤控制實驗已重設")
        flashSensor()
    }
}
