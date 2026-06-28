const AGENT_URL = 'http://localhost:5555';

export async function printViaAgent(sale: any): Promise<void> {
  try {
    const res = await fetch(`${AGENT_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('[print-agent] Xato:', data.error);
      alert(`Printer xato: ${data.error}`);
    }
  } catch {
    alert(
      'Print agent ishlamayapti!\n\n' +
      'Quyidagini bajaring:\n' +
      '1. print-agent papkasini oching\n' +
      '2. start.bat ni ikki marta bosing\n' +
      '3. Savdoni qayta amalga oshiring'
    );
  }
}
