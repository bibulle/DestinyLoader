var RELOAD_EVERY = 1 * 20 * 1000;
var previousDiv;
var previousMess = "";


var loadData = function () {

  setTimeout(loadData, RELOAD_EVERY);

  try {

    $.getJSON("monitorstuff/api", function (d) {


      if (d && d.error == "NotLogged") {
        $("#messages").html("<hr><p>Not logged, refreshing</p>");
        location.reload();
      }

      if (d && d.messages) {
        messagesDiv = $("#messages");

        var newDiv = $("<div></div>");
        newDiv.addClass("meessagesPacket");
        newDiv.append("<HR><p style='font-size: 0.8em'>" + (new Date()) + "</p>");
        d.messages.forEach(function (m) {
          newDiv.append("<p>" + m + "</p>");
        });
        messagesDiv.append(newDiv);

        if ((previousMess == "[]") || (previousMess == JSON.stringify(d.messages))) {
          previousDiv.remove();
        }

        previousMess=JSON.stringify(d.messages);
        previousDiv=newDiv;
      }
      $("html, body").animate({scrollTop: $(document).height() - $(window).height()});
      console.log(d);
    });

  } catch (e) {

  }

};

var init = function () {

  $(document).ready(function () {

    $("#input textarea").change(function () {
      $("#input textarea").addClass("saving");
      sendConf({conf: {chosen: $(this).val()}});
    }).change();

    $("#input button").click(function () {
      sendConf({conf: {mode: $(this).attr('id')}});
    });

    loadData();
  });
}

var sendConf = function (conf) {
  $.ajax({
    url: "monitorstuff/value",
    type: "POST",
    data: JSON.stringify(conf),
    contentType: "application/json",
  }).done(function (data) {

    var response = jQuery.parseJSON(data);

    $("#input textarea").removeClass("saving");
    if (response.error) {
      $("#input textarea").addClass("error");
    } else {
      $("#input textarea").removeClass("error");
      $("#input textarea").val(response.chosen);
    }

    $("#input button").removeClass("selected");
    $("#" + response.mode).addClass("selected");
  });
}