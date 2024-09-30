using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace RMIS.Models.sql
{
    public class AdminDist
    {
        public Guid Id { get; set; }
        public int orderId { get; set; }
        public string City { get; set; }
        public string Town { get; set; }
        public ICollection<Road> Roads { get; set; }
    }
}
