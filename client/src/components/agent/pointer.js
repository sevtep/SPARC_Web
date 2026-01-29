// Virtual Pointer - renders a pointer that moves smoothly
import { useEffect } from 'react'

let pointerElement = null
let currentX = 0
let currentY = 0

function ensurePointer() {
  if (pointerElement && document.body.contains(pointerElement)) {
    return pointerElement
  }

  // Create pointer element
  pointerElement = document.createElement('div')
  pointerElement.id = 'virtual-pointer'
  pointerElement.innerHTML = '👆'
  pointerElement.style.cssText = `
    position: fixed;
    z-index: 999999;
    pointer-events: none;
    font-size: 28px;
    transform: translate(-50%, -100%);
    transition: none;
    opacity: 0;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  `
  document.body.appendChild(pointerElement)
  
  // Initialize position to center
  currentX = window.innerWidth / 2
  currentY = window.innerHeight / 2
  pointerElement.style.left = `${currentX}px`
  pointerElement.style.top = `${currentY}px`

  return pointerElement
}

export function showPointer() {
  const pointer = ensurePointer()
  pointer.style.opacity = '1'
}

export function hidePointer() {
  if (pointerElement) {
    pointerElement.style.opacity = '0'
  }
}

export function movePointerTo(targetX, targetY, duration = 400) {
  return new Promise((resolve) => {
    const pointer = ensurePointer()
    showPointer()

    const startX = currentX
    const startY = currentY
    const startTime = performance.now()

    function animate(currentTime) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3)

      currentX = startX + (targetX - startX) * eased
      currentY = startY + (targetY - startY) * eased

      pointer.style.left = `${currentX}px`
      pointer.style.top = `${currentY}px`

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(animate)
  })
}

// React component for mounting/cleanup
export function VirtualPointer() {
  useEffect(() => {
    ensurePointer()
    
    return () => {
      if (pointerElement) {
        pointerElement.remove()
        pointerElement = null
      }
    }
  }, [])
  
  return null
}
