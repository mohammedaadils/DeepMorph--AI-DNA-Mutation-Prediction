/* ═══════════════════════════════════════════════
   DeepMorph AI — Hotspot DNA Helix Visualization
   Canvas-based double helix with mutation highlight
   ═══════════════════════════════════════════════ */

function drawHotspotHelix(canvasId, hotspotPosition, totalBases) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const bases = totalBases || 100;
    const hotspot = hotspotPosition || -1; // 1-indexed, -1 means no hotspot

    // Canvas sizing
    const nodeSpacing = 10;
    const canvasWidth = Math.max(bases * nodeSpacing + 60, 1060);
    canvas.width = canvasWidth;
    canvas.height = 280;

    const centerY = canvas.height / 2;
    const amplitude = 70;
    const startX = 30;

    // Colors
    const normalColor1 = '#0ea5e9';    // blue
    const normalColor2 = '#14b8a6';    // teal
    const hotspotColor = '#ef4444';     // red
    const hotspotGlow = 'rgba(239, 68, 68, 0.6)';
    const lineColor = 'rgba(14, 165, 233, 0.2)';
    const hotspotLineColor = 'rgba(239, 68, 68, 0.4)';

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvasWidth, 0);
    bgGrad.addColorStop(0, 'rgba(6, 11, 20, 0.8)');
    bgGrad.addColorStop(0.5, 'rgba(13, 22, 39, 0.6)');
    bgGrad.addColorStop(1, 'rgba(6, 11, 20, 0.8)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasWidth, canvas.height);

    // Draw rungs and nodes
    for (let i = 0; i < bases; i++) {
        const x = startX + i * nodeSpacing;
        const phase = (i / bases) * Math.PI * 6;
        const y1 = centerY + Math.sin(phase) * amplitude;
        const y2 = centerY + Math.sin(phase + Math.PI) * amplitude;

        const isHotspot = (i + 1) === hotspot;
        const depth = Math.abs(Math.cos(phase));

        // Draw connecting rung
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.strokeStyle = isHotspot ? hotspotLineColor : lineColor;
        ctx.lineWidth = isHotspot ? 2.5 : 1;
        ctx.stroke();

        // Draw top strand node
        const nodeRadius = isHotspot ? 5 : 2.5 + depth * 1.5;
        const color1 = isHotspot ? hotspotColor : normalColor1;
        const alpha1 = depth * 0.7 + 0.3;

        if (isHotspot) {
            // Glow effect for hotspot
            ctx.beginPath();
            ctx.arc(x, y1, 12, 0, Math.PI * 2);
            ctx.fillStyle = hotspotGlow;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y2, 12, 0, Math.PI * 2);
            ctx.fillStyle = hotspotGlow;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y1, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = isHotspot ? hotspotColor : `rgba(14, 165, 233, ${alpha1})`;
        ctx.fill();

        // Draw bottom strand node
        const alpha2 = Math.abs(Math.cos(phase + Math.PI)) * 0.7 + 0.3;
        const nodeRadius2 = isHotspot ? 5 : 2.5 + Math.abs(Math.cos(phase + Math.PI)) * 1.5;

        ctx.beginPath();
        ctx.arc(x, y2, nodeRadius2, 0, Math.PI * 2);
        ctx.fillStyle = isHotspot ? hotspotColor : `rgba(20, 184, 166, ${alpha2})`;
        ctx.fill();

        // Hotspot label
        if (isHotspot) {
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillStyle = hotspotColor;
            ctx.textAlign = 'center';
            ctx.fillText(`▼ Pos ${hotspot}`, x, Math.min(y1, y2) - 20);
        }
    }

    // Draw smooth helix curves on top
    ctx.lineWidth = 1.5;

    // Top strand curve
    ctx.beginPath();
    for (let i = 0; i < bases; i++) {
        const x = startX + i * nodeSpacing;
        const phase = (i / bases) * Math.PI * 6;
        const y = centerY + Math.sin(phase) * amplitude;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.25)';
    ctx.stroke();

    // Bottom strand curve
    ctx.beginPath();
    for (let i = 0; i < bases; i++) {
        const x = startX + i * nodeSpacing;
        const phase = (i / bases) * Math.PI * 6;
        const y = centerY + Math.sin(phase + Math.PI) * amplitude;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.25)';
    ctx.stroke();
}

// Auto-initialize when called from mutation_analysis page
document.addEventListener('DOMContentLoaded', () => {
    // Will be called from script.js after loading data
    // Expose globally
    window.drawHotspotHelix = drawHotspotHelix;
});
