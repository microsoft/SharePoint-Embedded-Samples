using Microsoft.AspNetCore.Mvc;

namespace SyntexRSDemo.Controllers
{
    public class PreviewItemController : Controller
    {
        public IActionResult Index(string webUrl)
        {
            ViewData["WebUrl"] = webUrl;
            return View();
        }
    }
}
