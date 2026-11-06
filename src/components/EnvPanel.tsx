import { Wind, Gauge, Radiation, Languages } from 'lucide-react'
import { RADIATION_LIMIT_MSV, evaluate } from '../lib/engine'
import type { Env, Results } from '../types/health'
import { useI18n } from '../lib/i18nContext'

export default function EnvPanel({ env, results }: { env: Env; results: Results }) {
  const { lang, setLang, t } = useI18n()
  const s = evaluate(env, results)
  const pct = Math.min(100, (env.cumulative / RADIATION_LIMIT_MSV) * 100)

  return (
    <aside id="env-panel" className="env-panel">
      <div className={`env-item lv-${s.environment}`}>
        <Wind size={18} />
        <div>
          <b>{env.co2.toFixed(1)}<small> mmHg</small></b>
          <span>{t('env.co2')}</span>
        </div>
      </div>

      <div className="env-item lv-nominal">
        <Gauge size={18} />
        <div>
          <b>{env.pressure.toFixed(1)}<small> psi</small></b>
          <span>{t('env.pressure')}</span>
        </div>
      </div>

      <div className={`env-item lv-${env.storm ? 'warning' : s.radiation === 'advisory' ? 'advisory' : 'nominal'}`}>
        <Radiation size={18} />
        <div>
          <b>{env.doseRate.toFixed(0)}<small> μSv/h</small></b>
          <span>{t('env.doseRate')}</span>
        </div>
      </div>

      <div className="env-item env-cum">
        <div className="cum-head">
          <span>{t('env.radiation')}</span>
          <b>{env.cumulative.toFixed(1)} / {RADIATION_LIMIT_MSV} mSv</b>
        </div>
        <div className="progress thick">
          <i className={`lv-${s.radiation}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 網站多語言切換按鈕（位於此條最右側） */}
      <div className="env-lang-toggle-wrap">
        <button
          type="button"
          className="env-lang-btn"
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          title={t('env.langToggle')}
          aria-label={t('env.langToggle')}
        >
          <Languages size={17} className="lang-icon" />
          <span className="lang-labels">
            <span className={`lang-opt ${lang === 'zh' ? 'active' : ''}`}>繁中</span>
            <span className="lang-sep">/</span>
            <span className={`lang-opt ${lang === 'en' ? 'active' : ''}`}>EN</span>
          </span>
        </button>
      </div>
    </aside>
  )
}
