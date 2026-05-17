// POPUP CLOSE

function closePopup(){

  document.getElementById("popup").style.display = "none";

}

/* AUTO SHOW POPUP AGAIN AFTER REFRESH */

window.onload = function(){

  document.getElementById("popup").style.display = "flex";

};

/* SMOOTH SCROLL ANIMATION */

const observer = new IntersectionObserver((entries)=>{

  entries.forEach((entry)=>{

    if(entry.isIntersecting){

      entry.target.classList.add("show");

    }

  });

});

const hiddenElements = document.querySelectorAll(
  ".feature-card, .slide-card, .cta-box"
);

hiddenElements.forEach((el)=> observer.observe(el));

/* PARALLAX BACKGROUND EFFECT */

document.addEventListener("mousemove",(e)=>{

  const moveX = (e.clientX / window.innerWidth - 0.5) * 20;

  const moveY = (e.clientY / window.innerHeight - 0.5) * 20;

  document.body.style.backgroundPosition =
    `${moveX}px ${moveY}px`;

});

/* OPTIONAL FUTURE LOADER */

console.log("Ravi EDITZ Loaded Successfully ✨");