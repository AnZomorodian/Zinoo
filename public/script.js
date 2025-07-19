document.addEventListener('DOMContentLoaded', function() {
    const healthCheckBtn = document.getElementById('healthCheck');
    const apiResult = document.getElementById('apiResult');
    
    healthCheckBtn.addEventListener('click', async function() {
        try {
            healthCheckBtn.textContent = 'Testing...';
            healthCheckBtn.disabled = true;
            
            const response = await fetch('/api/health');
            const data = await response.json();
            
            apiResult.textContent = JSON.stringify(data, null, 2);
            apiResult.style.borderLeftColor = response.ok ? '#38a169' : '#e53e3e';
            
        } catch (error) {
            apiResult.textContent = `Error: ${error.message}`;
            apiResult.style.borderLeftColor = '#e53e3e';
        } finally {
            healthCheckBtn.textContent = 'Test API Connection';
            healthCheckBtn.disabled = false;
        }
    });
    
    // Auto-run health check on load
    setTimeout(() => {
        healthCheckBtn.click();
    }, 1000);
});