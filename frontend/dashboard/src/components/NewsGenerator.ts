import { ask, semanticSearch } from '../api';

export interface NewsItem {
  text: string;
  countryCode?: string;
  icon?: string;
}

/**
 * Triggera la generazione agentica delle news basata su dati real-time e RAG.
 * Non restituisce i risultati direttamente, poiché questi verranno ricevuti via Socket.io.
 */
export async function triggerAgenticNews(props: any, currentLocale: string, t: (key: string, params?: any) => string): Promise<void> {
  const promises: Promise<void>[] = [];

  const addNewsPromise = (promptKey: string, params: any, meta: any = {}, searchQuery: string | null = null) => {
    const flow = searchQuery 
      ? semanticSearch(searchQuery, { limit: 2, scoreThreshold: 0.5 })
          .then(res => {
            const context = res.results?.map((h: any) => h.text).join('\n') || '';
            const prompt = t(`home.breakingNews.prompts.${promptKey}`, { ...params, context, locale: 'it-IT' });
            return ask(prompt);
          })
      : ask(t(`home.breakingNews.prompts.${promptKey}`, { ...params, locale: 'it-IT' }));

    const p = flow
      .then(() => {
        // Notifica di invio completato (anche se la risposta HTTP arriva dopo 20s, non ci importa bloccare triggerAgenticNews)
        console.debug(`[NewsGenerator] AI Request finished for ${promptKey}`);
      })
      .catch(err => console.error(`[NewsGenerator] AI Trigger Error for ${promptKey}:`, err));
    promises.push(p);
  };

  // 1. Geopolitical Narrative
  if (props.attacks.length > 0) {
    const countries = props.attacks.map((a: any) => a.ipDetails?.ipinfo?.country || a.ipDetails?.country).filter(Boolean);
    if (countries.length > 0) {
      const counts = countries.reduce((acc: any, c: string) => ({ ...acc, [c]: (acc[c] || 0) + 1 }), {});
      const topCountry = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      addNewsPromise('topCountry', { country: topCountry }, { countryCode: topCountry }, `Attacchi recenti da ${topCountry}`);
    }
  }

  // 2. Recent Attack IPs
  if (props.attacks.length >= 2) {
    const topIp = props.attacks[0].request?.ip;
    addNewsPromise('lastAttacks', { ips: topIp }, { icon: '🛰️' }, `Attività tecnica IP ${topIp}`);
  }

  // 3. Persistent Actor Intelligence
  if (props.sessions.length > 0) {
    const mostActive = [...props.sessions].sort((a: any, b: any) => (b.eventCount || 0) - (a.eventCount || 0))[0];
    if (mostActive) {
      addNewsPromise('mostActiveSession', { ip: mostActive.src_ip, count: mostActive.eventCount || 0 }, {
        icon: '📟',
        countryCode: mostActive.ipDetailsId?.ipinfo?.country || mostActive.ipDetailsId?.country
      }, `Sessioni interattive IP ${mostActive.src_ip}`);
    }
  }

  // 4. Critical Incursion Alert
  const critical = props.attacks.find((a: any) => a.dangerLevel >= 4);
  if (critical) {
    addNewsPromise('criticalAlert', { ip: critical.request?.ip }, { icon: '⚠️' }, `Dettaglio attacco critico ${critical.request?.ip}`);
  }

  // 5. Emerging Traffic Pattern
  if (props.logs.length > 0) {
    const specificUrls = props.logs.map((l: any) => l.request?.url).filter((u: string) => u && u !== '/' && u !== '\\');
    if (specificUrls.length > 0) {
      const counts = specificUrls.reduce((acc: any, u: string) => ({ ...acc, [u]: (acc[u] || 0) + 1 }), {});
      const topUrl = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      addNewsPromise('targetDiscovery', { path: topUrl }, { icon: '🔍' }, `Richieste sospette su endpoint ${topUrl}`);
    }
  }

  // Non attendiamo il completamento delle promesse (che includono l'ask sincrono dell'LLM)
  // Questo rende la funzione triggerAgenticNews istantanea per il chiamante.
  // I risultati arriveranno comunque via Socket.io grazie al bridge del backend.
  Promise.allSettled(promises);
}

/**
 * Genera news statiche come fallback basandosi sui dati reali.
 */
export function generateStaticFallback(props: any, t: (key: string, params?: any) => string): NewsItem[] {
  const fallbackList: NewsItem[] = [];
  
  if (props.attacks.length > 0) {
    const countries = props.attacks.map((a: any) => a.ipDetails?.ipinfo?.country || a.ipDetails?.country).filter(Boolean);
    if (countries.length > 0) {
      const counts = countries.reduce((acc: any, c: string) => ({ ...acc, [c]: (acc[c] || 0) + 1 }), {});
      const topCountry = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      fallbackList.push({ text: t('home.breakingNews.topCountry', { country: topCountry }), countryCode: topCountry });
    }
  }

  const critical = props.attacks.find((a: any) => a.dangerLevel >= 4);
  if (critical) {
    fallbackList.push({ text: t('home.breakingNews.criticalAlert', { ip: critical.request?.ip }), icon: '⚠️' });
  }

  if (props.logs.length > 0) {
    const urls = props.logs.map((l: any) => l.request?.url).filter((u: string) => u && u !== '/' && u !== '\\');
    if (urls.length > 0) {
      fallbackList.push({ text: t('home.breakingNews.targetDiscovery', { path: urls[0] }), icon: '🔍' });
    }
  }

  return fallbackList.length > 0 ? fallbackList : [{ text: t('home.system_idle'), icon: '🛰️' }];
}
