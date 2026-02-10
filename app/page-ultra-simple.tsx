export default function HomePage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>ClickAnunț</h1>
      <p style={{ fontSize: '20px', color: '#666', marginBottom: '40px' }}>
        Platforma de anunțuri gratuite
      </p>
      <a 
        href="/listings" 
        style={{ 
          display: 'inline-block',
          padding: '15px 30px', 
          backgroundColor: '#FF7900', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '8px',
          fontWeight: 'bold',
          marginRight: '10px'
        }}
      >
        Vezi Anunțuri
      </a>
      <a 
        href="/auth/register" 
        style={{ 
          display: 'inline-block',
          padding: '15px 30px', 
          backgroundColor: '#333', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '8px',
          fontWeight: 'bold'
        }}
      >
        Înregistrează-te
      </a>
      <div style={{ marginTop: '60px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', maxWidth: '800px', margin: '60px auto 0' }}>
        <div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#FF7900' }}>50K+</div>
          <div style={{ color: '#999' }}>Anunțuri</div>
        </div>
        <div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#FF7900' }}>100K+</div>
          <div style={{ color: '#999' }}>Utilizatori</div>
        </div>
        <div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#FF7900' }}>1M+</div>
          <div style={{ color: '#999' }}>Vizitatori/lună</div>
        </div>
      </div>
    </div>
  );
}
