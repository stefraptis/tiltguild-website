(function($) {

  "use strict";

  var initSlickSlider = function() {

    $('.style2 .slider').slick({
      autoplay: false,
      autoplaySpeed: 2000,
      fade: true,
      prevArrow: $('.prev'),
      nextArrow: $('.next'),
    });  


    $('.slider-for').slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      fade: true,
      asNavFor: '.slider-nav'
    });
    $('.slider-nav').slick({
      slidesToShow: 3,
      slidesToScroll: 1,
      arrows: false,
      asNavFor: '.slider-for',
      centerMode: true,
      focusOnSelect: true,
      variableWidth: false,
    });
  }  

  // init Chocolat light box
  var initChocolat = function() {
    Chocolat(document.querySelectorAll('.image-link'), {
        imageSize: 'contain',
        loop: true,
    })
  }

  // init jarallax parallax
  var initJarallax = function() {
    jarallax(document.querySelectorAll(".jarallax"));

    jarallax(document.querySelectorAll(".jarallax-keep-img"), {
      keepImg: true,
    });
  }

  // sidebar menu
  var initSidebarMenu = function() {
    $('.closebtn').on('click', function () {
        $('.nav-sidebar').removeClass('active');
    });

    $('#navsidebarCollapse').on('click', function () {
        $('.nav-sidebar').addClass('active');
        $('.collapse.in').toggleClass('in');
        $('a[aria-expanded=true]').attr('aria-expanded', 'false');
    });
  }

  $(document).ready(function () {           
      initSidebarMenu();
      initSlickSlider();
      initJarallax();
      initChocolat();
  });

  $(window).load(function() {
    $("#overlayer").fadeOut("slow");
  })

})(jQuery);
