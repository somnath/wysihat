Object.extend(String.prototype, (function() {
  /**
   * String#format_html_output() -> String
   *
   *  Cleanup browser's HTML mess!
   *
   *  There is no standard formatting among the major browsers for the rich
   *  text output. Safari wraps its line breaks with "div" tags, Firefox puts
   *  "br" tags at the end of the line, and other such as Internet Explorer
   *  wrap lines in "p" tags.
   *
   *  The output is a standarizes these inconsistencies and produces a clean
   *  result. A single return creates a line break "br" and double returns
   *  create a new paragraph. This is similar to how Textile and Markdown
   *  handle whitespace.
   *
   *  Raw browser content => String#format_html_output => Textarea
   **/
  function format_html_output() {
    var text = String(this);
    text = text.tidy_xhtml();

    if (Prototype.Browser.WebKit) {
      // Extra divs expand to line breaks
      text = text.replace(/(<div>)+/g, "\n");
      text = text.replace(/(<\/div>)+/g, "");

      // Trash extra paragraphs
      text = text.replace(/<p>\s*<\/p>/g, "");

      // Convert line break tags into real line breaks
      text = text.replace(/<br \/>(\n)*/g, "\n");
    } else if (Prototype.Browser.Gecko) {
      // Convert any strangling paragraphs into line breaks
      text = text.replace(/<p>/g, "");
      text = text.replace(/<\/p>(\n)?/g, "\n");

      // Convert line break tags into real line breaks
      text = text.replace(/<br \/>(\n)*/g, "\n");
    } else if (Prototype.Browser.IE || Prototype.Browser.Opera) {
      // Treat lines with one space as returns
      text = text.replace(/<p>(&nbsp;|&#160;|\s)<\/p>/g, "<p></p>");

      // Line break tags are useless
      text = text.replace(/<br \/>/g, "");

      // Kill all paragraph opens
      text = text.replace(/<p>/g, '');

      // Clean up nonbreaking spaces
      text = text.replace(/&nbsp;/g, '');

      // Paragraphs translate to line breaks
      text = text.replace(/<\/p>(\n)?/g, "\n");

      // Trim off leading and trailing paragraph tags
      // TODO: Removing the following line does not cause any tests to fail
      text = text.gsub(/^<p>/, '');
      // TODO: Removing the following line does not cause any tests to fail
      text = text.gsub(/<\/p>$/, '');
    }

    // bold tag to strong
    // TODO: Removing the following line does not cause any tests to fail
    text = text.gsub(/<b>/, "<strong>");
    // TODO: Removing the following line does not cause any tests to fail
    text = text.gsub(/<\/b>/, "</strong>");

    // italic tag to em
    // TODO: Removing the following line does not cause any tests to fail
    text = text.gsub(/<i>/, "<em>");
    // TODO: Removing the following line does not cause any tests to fail
    text = text.gsub(/<\/i>/, "</em>");

    // Convert double returns into paragraphs
    text = text.replace(/\n\n+/g, "</p>\n\n<p>");

    // Convert a single return into a line break
    text = text.gsub(/(([^\n])(\n))(?=([^\n]))/, "#{2}<br />\n");

    // Sandwich with p tags
    text = '<p>' + text + '</p>';

    // Trim whitespace before and after paragraph tags
    text = text.replace(/<p>\s*/g, "<p>");
    text = text.replace(/\s*<\/p>/g, "</p>");

    var element = Element("body");
    element.innerHTML = text;

    if (Prototype.Browser.WebKit || Prototype.Browser.Gecko) {
      var replaced;
      do {
        replaced = false;
        element.select('span').each(function(span) {
          if (span.hasClassName('Apple-style-span')) {
            span.removeClassName('Apple-style-span');
            if (span.className == '')
              span.removeAttribute('class');
            replaced = true;
          } else if (span.getStyle('fontWeight') == 'bold') {
            span.setStyle({fontWeight: ''});
            if (span.style.length == 0)
              span.removeAttribute('style');
            span.update('<strong>' + span.innerHTML + '</strong>');
            replaced = true;
          } else if (span.getStyle('fontStyle') == 'italic') {
            span.setStyle({fontStyle: ''});
            if (span.style.length == 0)
              span.removeAttribute('style');
            span.update('<em>' + span.innerHTML + '</em>');
            replaced = true;
          } else if (span.getStyle('textDecoration') == 'underline') {
            span.setStyle({textDecoration: ''});
            if (span.style.length == 0)
              span.removeAttribute('style');
            span.update('<u>' + span.innerHTML + '</u>');
            replaced = true;
          } else if (span.attributes.length == 0) {
            span.replace(span.innerHTML);
            replaced = true;
          }
        });
      } while (replaced);

    }

    for (var i = 0; i < element.descendants().length; i++) {
      var node = element.descendants()[i];
      if (node.innerHTML.blank() && node.nodeName != 'BR' && node.id != 'bookmark')
        node.remove();
    }

    text = element.innerHTML;
    text = text.tidy_xhtml();

    // Normalize whitespace after linebreaks and between paragraphs
    text = text.replace(/<br \/>(\n)*/g, "<br />\n");
    text = text.replace(/<\/p>\n<p>/g, "</p>\n\n<p>");

    // Cleanup empty paragraphs
    text = text.replace(/<p>\s*<\/p>/g, "");

    // Trim whitespace at the end
    text = text.replace(/\s*$/g, "");

    return text;
  }

  /**
   * String#format_html_input() -> String
   *
   *  Prepares sane HTML for editing.
   *
   *  This function preforms the reserve function of String#format_html_output. Each
   *  browser has difficulty editing mix formatting conventions. This restores
   *  most of the original browser specific formatting tags and some other
   *  styling conventions.
   *
   *  Textarea => String#format_html_input => Raw content
  **/
  function format_html_input() {
    var text = String(this);

    var element = Element("body");
    element.innerHTML = text;

    if (Prototype.Browser.Gecko || Prototype.Browser.WebKit) {
      // Convert style spans back
      element.select('strong').each(function(element) {
        element.replace('<span style="font-weight: bold;">' + element.innerHTML + '</span>');
      });
      element.select('em').each(function(element) {
        element.replace('<span style="font-style: italic;">' + element.innerHTML + '</span>');
      });
      element.select('u').each(function(element) {
        element.replace('<span style="text-decoration: underline;">' + element.innerHTML + '</span>');
      });
    }

    // TODO: Test if WebKit has issues editing spans without
    // "Apple-style-span". If not, remove this.
    if (Prototype.Browser.WebKit)
      element.select('span').each(function(span) {
        if (span.getStyle('fontWeight') == 'bold')
          span.addClassName('Apple-style-span');

        if (span.getStyle('fontStyle') == 'italic')
          span.addClassName('Apple-style-span');

        if (span.getStyle('textDecoration') == 'underline')
          span.addClassName('Apple-style-span');
      });

    text = element.innerHTML;
    text = text.tidy_xhtml();

    // Convert paragraphs into double returns
    text = text.replace(/<\/p>(\n)*<p>/g, "\n\n");

    // Convert line breaks into single returns
    text = text.replace(/(\n)?<br( \/)?>(\n)?/g, "\n");

    // Chop off leading and trailing paragraph tags
    text = text.replace(/^<p>/g, '');
    text = text.replace(/<\/p>$/g, '');

    if (Prototype.Browser.Gecko) {
      // Replace returns with line break tags
      text = text.replace(/\n/g, "<br>");
      text = text + '<br>';
    } else if (Prototype.Browser.WebKit) {
      // Wrap lines in div tags
      text = text.replace(/\n/g, "</div><div>");
      text = '<div>' + text + '</div>';
      text = text.replace(/<div><\/div>/g, "<div><br></div>");
    } else if (Prototype.Browser.IE || Prototype.Browser.Opera) {
      text = text.replace(/\n/g, "</p>\n<p>");
      text = '<p>' + text + '</p>';
      text = text.replace(/<p><\/p>/g, "<p>&nbsp;</p>");
      text = text.replace(/(<p>&nbsp;<\/p>)+$/g, "");
    }

    return text;
  }

  /**
   * String#tidy_xhtml() -> String
   *
   *  Normalizes and tidies text into XHTML content.
   *   * Strips out browser line breaks, '\r'
   *   * Downcases tag names
   *   * Closes line break tags
   **/
  function tidy_xhtml() {
    var text = String(this);

    // Remove IE's linebreaks
    text = text.gsub(/\r\n?/, "\n");

    // Downcase tags
    text = text.gsub(/<([A-Z]+)([^>]*)>/, function(match) {
      return '<' + match[1].toLowerCase() + match[2] + '>';
    });

    text = text.gsub(/<\/([A-Z]+)>/, function(match) {
      return '</' + match[1].toLowerCase() + '>';
    });

    // Close linebreak elements
    text = text.replace(/<br>/g, "<br />");

    return text;
  }

  return {
    format_html_output: format_html_output,
    format_html_input:  format_html_input,
    tidy_xhtml:         tidy_xhtml
  };
})());
