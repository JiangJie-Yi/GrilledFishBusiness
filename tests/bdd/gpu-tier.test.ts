import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { gpuTier, type DeviceInfo } from '@/game/system/gpuTier'

// (the names as Chrome on Windows gives them, through ANGLE)
const angle = (vendor: string, name: string) => `ANGLE (${vendor}, ${name} (0x00001234) Direct3D11 vs_5_0 ps_5_0, D3D11)`
const pc = (gpu: string, more: Partial<DeviceInfo> = {}): DeviceInfo => ({ gpu, touch: false, mac: false, mem: 8, cores: 8, ...more })

feature('一開頁就照顯示卡選畫質', () => {
  scenario('有獨立顯示卡的電腦用最高畫質', ({ given, then }) => {
    given('NVIDIA RTX、GTX 與 AMD RX 的桌機', (w) => {
      w.cards = [angle('NVIDIA', 'NVIDIA GeForce RTX 3060'), angle('NVIDIA', 'NVIDIA GeForce GTX 1650'), angle('AMD', 'AMD Radeon RX 6600')]
    })
    then('都是高', (w) => { for (const g of w.cards) expect(gpuTier(pc(g))).toBe('high') })
  })

  scenario('筆電的內建顯示晶片從中等開始', ({ given, then }) => {
    given('Intel UHD、Iris Xe、AMD 處理器內建的 Radeon、NVIDIA MX', (w) => {
      w.chips = [
        angle('Intel', 'Intel(R) UHD Graphics 620'), angle('Intel', 'Intel(R) Iris(R) Xe Graphics'),
        angle('AMD', 'AMD Radeon(TM) Graphics'), angle('AMD', 'AMD Radeon(TM) Vega 8 Graphics'),
        angle('NVIDIA', 'NVIDIA GeForce MX450'), angle('NVIDIA', 'NVIDIA GeForce 940MX'),
      ]
    })
    then('都是中', (w) => { for (const g of w.chips) expect(gpuTier(pc(g))).toBe('medium') })
  })

  scenario('強的內建顯示晶片仍是最高', ({ given, then }) => {
    given('Intel Arc 與 Radeon 780M', (w) => { w.chips = [angle('Intel', 'Intel(R) Arc(TM) Graphics'), angle('AMD', 'AMD Radeon(TM) 780M')] })
    then('是高', (w) => { for (const g of w.chips) expect(gpuTier(pc(g))).toBe('high') })
  })

  scenario('舊的內建顯示晶片與軟體繪圖用最低', ({ given, then, and }) => {
    given('Intel HD Graphics 4000、HD 620', (w) => { w.old = [angle('Intel', 'Intel(R) HD Graphics 4000'), angle('Intel', 'Intel(R) HD Graphics 620')] })
    then('是低', (w) => { for (const g of w.old) expect(gpuTier(pc(g))).toBe('low') })
    and('沒有顯示卡、由處理器畫的（SwiftShader、Microsoft Basic Render）也是低，Mac 與平板也一樣', () => {
      expect(gpuTier(pc('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'))).toBe('low')
      expect(gpuTier(pc(angle('Microsoft', 'Microsoft Basic Render Driver')))).toBe('low')
      expect(gpuTier(pc('llvmpipe (LLVM 15.0.7, 256 bits)', { mac: true }))).toBe('low')
      expect(gpuTier(pc('SwiftShader', { touch: true }))).toBe('low')
    })
    and('只有兩個核心的電腦也是低', () => { expect(gpuTier(pc(angle('NVIDIA', 'NVIDIA GeForce RTX 3060'), { cores: 2 }))).toBe('low') })
  })

  scenario('Mac 照舊從中等開始', ({ given, then }) => {
    given('Apple M1 與 M3 Max', (w) => { w.macs = ['Apple M1', 'Apple M3 Max'] })
    then('是中', (w) => { for (const g of w.macs) expect(gpuTier(pc(g, { mac: true }))).toBe('medium') })
  })

  scenario('看不到顯示卡名稱的電腦照舊用最高，記憶體少的降一級', ({ given, then, and }) => {
    given('瀏覽器不告訴顯示卡名稱', () => {})
    then('記憶體夠是高', () => { expect(gpuTier(pc('WebKit WebGL'))).toBe('high') })
    and('記憶體 4 GB 以下是中', () => { expect(gpuTier(pc('', { mem: 4 }))).toBe('medium') })
  })

  scenario('平板照以前的判斷', ({ given, then, and }) => {
    given('觸控、沒有滑鼠的裝置', () => {})
    then('舊的晶片是低', () => { expect(gpuTier({ gpu: 'Mali-G52', touch: true, mac: false, mem: 8, cores: 8 })).toBe('low') })
    and('記憶體 8 GB 的 iPad（自稱 Mac）是高', () => { expect(gpuTier({ gpu: 'Apple GPU', touch: true, mac: true, mem: 8, cores: 8 })).toBe('high') })
    and('一般的是中', () => { expect(gpuTier({ gpu: 'Adreno (TM) 660', touch: true, mac: false, mem: 6, cores: 8 })).toBe('medium') })
  })
})
