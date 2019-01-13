var sheet = document.createElement('style'),  
  $rangeInputWek = $('.rangeWek input'),
  prefs = ['webkit-slider-runnable-track', 'moz-range-track', 'ms-track'];

document.body.appendChild(sheet);

var getTrackStyleWek = function (el) {  
  var curVal = el.value,
      val = (curVal - 1) * 25;
      style = '';
  
  // Set active label
  $('.rangeWek-labels li').removeClass('active selected');
  
  var curLabel = $('.rangeWek-labels').find('li:nth-child(' + curVal + ')');

  curLabel.addClass('active selected');
  curLabel.prevAll().addClass('selected');
  
  // Change background gradient
  for (var i = 0; i < prefs.length; i++) {

    if (curVal==5)
    {
      style += '.rangeWek {background: linear-gradient(to right, #FF0000 0%, #FF0000 ' + val + '%, #fff ' + val + '%, #fff 100%)}';
      style += '.rangeWek input::-' + prefs[i] + '{background: linear-gradient(to right, #FF0000 0%, #FF0000 ' + val + '%, #FF0000 ' + val + '%, #b2b2b2 100%)}';
      style += '.rangeWek input::-webkit-slider-thumb {background: #FF0000}';
      style += '.rangeWek-labels .selected::before {background: #FF0000}';
    }
    else if (curVal==4)
    {  
      style += '.rangeWek {background: linear-gradient(to right, #ED7D31 0%, #ED7D31 ' + val + '%, #fff ' + val + '%, #fff 100%)}';
      style += '.rangeWek input::-' + prefs[i] + '{background: linear-gradient(to right, #ED7D31 0%, #ED7D31 ' + val + '%, #ED7D31 ' + val + '%, #b2b2b2 100%)}';
      style += '.rangeWek input::-webkit-slider-thumb {background: #ED7D31}';
      style += '.rangeWek-labels .selected::before {background: #ED7D31}';
    }
    else if (curVal==3)
    {
      style += '.rangeWek {background: linear-gradient(to right, #FFD966 0%, #FFD966 ' + val + '%, #fff ' + val + '%, #fff 100%)}';
      style += '.rangeWek input::-' + prefs[i] + '{background: linear-gradient(to right, #FFD966 0%, #FFD966 ' + val + '%, #FFD966 ' + val + '%, #b2b2b2 100%)}';
      style += '.rangeWek input::-webkit-slider-thumb {background: #FFD966}';
      style += '.rangeWek-labels .selected::before {background: #FFD966}';
    }
    else if (curVal==2)
    {
      style += '.rangeWek {background: linear-gradient(to right, #FFFF00 0%, #FFFF00 ' + val + '%, #fff ' + val + '%, #fff 100%)}';
      style += '.rangeWek input::-' + prefs[i] + '{background: linear-gradient(to right, #FFFF00 0%, #FFFF00 ' + val + '%, #FFFF00 ' + val + '%, #b2b2b2 100%)}';
      style += '.rangeWek input::-webkit-slider-thumb {background: #FFFF00}';
      style += '.rangeWek-labels .selected::before {background: #FFFF00}';
    }
    else
    {
      style += '.rangeWek {background: linear-gradient(to right, #92D050 0%, #92D050 ' + val + '%, #fff ' + val + '%, #fff 100%)}';
      style += '.rangeWek input::-' + prefs[i] + '{background: linear-gradient(to right, #92D050 0%, #92D050 ' + val + '%, #92D050 ' + val + '%, #b2b2b2 100%)}';
      style += '.rangeWek input::-webkit-slider-thumb {background: #92D050}';
    }
  }

  return style;
}

$rangeInputWek.on('input', function () {

  sheet.textContent += getTrackStyleWek(this);
  
});

// Change input value on label click
$('.rangeWek-labels li').on('click', function () {
  var index = $(this).index();

  $rangeInputWek.val(index + 1).trigger('input');
  
});

